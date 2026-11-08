/**
 * Facade pattern: one simple `placeOrder` call in front of four subsystems.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (FacadeDemo.tsx).
 */

/** Where participants write their trace lines (console by default, React state in the UI). */
export type Log = (line: string) => void;

export interface Customer {
  readonly name: string;
  readonly email: string;
}

export interface OrderItem {
  readonly sku: string;
  readonly quantity: number;
}

/** What the facade returns: one simple value instead of four subsystem results. */
export type OrderResult =
  | { readonly success: true; readonly total: number; readonly tracking: string }
  | { readonly success: false; readonly error: string };

export const money = (amount: number): string => `$${amount.toFixed(2)}`;

/** Subsystem class: knows prices and stock levels, and reserves/releases units. */
export class InventoryService {
  private readonly prices = new Map<string, number>([
    ["keyboard", 79.99],
    ["mouse", 29.99],
    ["monitor", 199.0],
    ["webcam", 49.5],
  ]);
  private readonly stock = new Map<string, number>([
    ["keyboard", 10],
    ["mouse", 5],
    ["monitor", 5],
    ["webcam", 3],
  ]);

  constructor(private readonly log: Log = console.log) {}

  get skus(): string[] {
    return [...this.stock.keys()];
  }

  priceOf(sku: string): number {
    return this.prices.get(sku) ?? 0;
  }

  stockOf(sku: string): number {
    return this.stock.get(sku) ?? 0;
  }

  isAvailable(sku: string, quantity: number): boolean {
    const inStock = this.stockOf(sku);
    const ok = inStock >= quantity;
    this.log(
      ok
        ? `  [inventory] check ${sku} x${quantity}: ok (${inStock} in stock)`
        : `  [inventory] check ${sku} x${quantity}: only ${inStock} in stock`,
    );
    return ok;
  }

  reserve(sku: string, quantity: number): void {
    this.stock.set(sku, this.stockOf(sku) - quantity);
    this.log(`  [inventory] reserved ${sku} x${quantity}`);
  }

  release(sku: string, quantity: number): void {
    this.stock.set(sku, this.stockOf(sku) + quantity);
    this.log(`  [inventory] released ${sku} x${quantity} (rollback)`);
  }
}

/** Subsystem class: charges and refunds cards (simulated payment gateway). */
export class PaymentService {
  private nextTransaction = 1001;

  constructor(private readonly log: Log = console.log) {}

  charge(cardNumber: string, amount: number): string {
    const transactionId = `TXN-${this.nextTransaction++}`;
    this.log(`  [payment] charged ${money(amount)} to card ending ${cardNumber.slice(-4)} (${transactionId})`);
    return transactionId;
  }

  refund(transactionId: string, amount: number): void {
    this.log(`  [payment] refunded ${money(amount)} (${transactionId})`);
  }
}

/** Subsystem class: books shipments with the carrier. */
export class ShippingService {
  private nextShipment = 5001;

  constructor(private readonly log: Log = console.log) {}

  createShipment(customer: Customer, items: readonly OrderItem[]): string {
    const tracking = `SHP-${this.nextShipment++}`;
    const units = items.reduce((sum, i) => sum + i.quantity, 0);
    this.log(`  [shipping] shipment ${tracking} created for ${customer.name} (${units} items)`);
    return tracking;
  }
}

/** Subsystem class: sends e-mails to customers. */
export class NotificationService {
  constructor(private readonly log: Log = console.log) {}

  sendEmail(to: string, message: string): void {
    this.log(`  [email] to ${to}: ${message}`);
  }
}

/**
 * The Facade: one simple entry point for "place an order". It knows which
 * subsystems to call, in which order, and how to undo partial work when a
 * step fails. Clients no longer orchestrate the subsystems themselves.
 */
export class OrderFacade {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payment: PaymentService,
    private readonly shipping: ShippingService,
    private readonly notification: NotificationService,
  ) {}

  placeOrder(customer: Customer, items: readonly OrderItem[], cardNumber: string): OrderResult {
    // 1-2. Check stock and reserve each item; roll back earlier reservations on failure.
    const reserved: OrderItem[] = [];
    for (const item of items) {
      if (!this.inventory.isAvailable(item.sku, item.quantity)) {
        for (const r of reserved) this.inventory.release(r.sku, r.quantity);
        this.notification.sendEmail(customer.email, `Order failed: ${item.sku} is out of stock`);
        return {
          success: false,
          error: `${item.sku} is out of stock (requested ${item.quantity}, available ${this.inventory.stockOf(item.sku)})`,
        };
      }
      this.inventory.reserve(item.sku, item.quantity);
      reserved.push(item);
    }

    // 3. Charge the card.
    const total = items.reduce((sum, i) => sum + this.inventory.priceOf(i.sku) * i.quantity, 0);
    this.payment.charge(cardNumber, total);

    // 4. Create the shipment.
    const tracking = this.shipping.createShipment(customer, items);

    // 5. Tell the customer.
    this.notification.sendEmail(customer.email, `Order confirmed, total ${money(total)}, tracking ${tracking}`);
    return { success: true, total, tracking };
  }
}

/** Convenience: wires the default subsystems behind a facade, all logging to the same sink. */
export function createShop(log: Log = console.log): { shop: OrderFacade; inventory: InventoryService } {
  const inventory = new InventoryService(log);
  const shop = new OrderFacade(
    inventory,
    new PaymentService(log),
    new ShippingService(log),
    new NotificationService(log),
  );
  return { shop, inventory };
}
