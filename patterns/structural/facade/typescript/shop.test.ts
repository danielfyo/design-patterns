import { describe, expect, it } from "vitest";
import {
  InventoryService,
  NotificationService,
  OrderFacade,
  PaymentService,
  ShippingService,
  createShop,
  money,
  type Customer,
} from "./shop.ts";

const CARD = "4242 4242 4242 4242";
const alice: Customer = { name: "Alice", email: "alice@example.com" };

function setup() {
  const lines: string[] = [];
  return { lines, ...createShop((line) => lines.push(line)) };
}

describe("Facade: e-commerce order placement", () => {
  it("returns the total and tracking number and reserves stock", () => {
    const { shop, inventory } = setup();

    const result = shop.placeOrder(
      alice,
      [
        { sku: "keyboard", quantity: 2 },
        { sku: "mouse", quantity: 1 },
      ],
      CARD,
    );

    expect(result).toEqual({ success: true, total: 189.97, tracking: "SHP-5001" });
    expect(inventory.stockOf("keyboard")).toBe(8);
    expect(inventory.stockOf("mouse")).toBe(4);
  });

  it("calls the subsystems in order", () => {
    const { shop, lines } = setup();

    shop.placeOrder(alice, [{ sku: "monitor", quantity: 1 }], CARD);

    expect(lines.map((l) => l.trim().split(" ")[0])).toEqual([
      "[inventory]",
      "[inventory]",
      "[payment]",
      "[shipping]",
      "[email]",
    ]);
  });

  it("rolls back earlier reservations when an item is out of stock", () => {
    const { shop, inventory, lines } = setup();

    const result = shop.placeOrder(
      alice,
      [
        { sku: "monitor", quantity: 1 },
        { sku: "webcam", quantity: 5 },
      ],
      CARD,
    );

    expect(result).toEqual({ success: false, error: "webcam is out of stock (requested 5, available 3)" });
    expect(inventory.stockOf("monitor")).toBe(5);
    expect(inventory.stockOf("webcam")).toBe(3);
    expect(lines).toContain("  [inventory] released monitor x1 (rollback)");
  });

  it("never charges or ships a failed order but notifies the customer", () => {
    const { shop, lines } = setup();

    shop.placeOrder(alice, [{ sku: "webcam", quantity: 4 }], CARD);

    const output = lines.join("\n");
    expect(output).not.toContain("[payment]");
    expect(output).not.toContain("[shipping]");
    expect(output).not.toContain("released");
    expect(lines).toContain("  [email] to alice@example.com: Order failed: webcam is out of stock");
  });

  it("does not consume a tracking number for a failed order", () => {
    const { shop } = setup();

    shop.placeOrder(alice, [{ sku: "webcam", quantity: 9 }], CARD);
    const result = shop.placeOrder(alice, [{ sku: "webcam", quantity: 1 }], CARD);

    expect(result).toMatchObject({ success: true, tracking: "SHP-5001" });
  });

  it("keeps subsystem state between consecutive orders", () => {
    const { shop, inventory } = setup();

    const first = shop.placeOrder(alice, [{ sku: "webcam", quantity: 2 }], CARD);
    const second = shop.placeOrder(alice, [{ sku: "webcam", quantity: 2 }], CARD);

    expect(first).toMatchObject({ success: true, tracking: "SHP-5001" });
    expect(second).toEqual({ success: false, error: "webcam is out of stock (requested 2, available 1)" });
    expect(inventory.stockOf("webcam")).toBe(1);
  });

  it("can be wired by hand from the individual subsystems", () => {
    const lines: string[] = [];
    const log = (line: string) => lines.push(line);
    const shop = new OrderFacade(
      new InventoryService(log),
      new PaymentService(log),
      new ShippingService(log),
      new NotificationService(log),
    );

    const result = shop.placeOrder(alice, [{ sku: "mouse", quantity: 2 }], CARD);

    expect(result).toMatchObject({ success: true, total: 59.98 });
    expect(lines).toContain("  [payment] charged $59.98 to card ending 4242 (TXN-1001)");
  });

  it("formats money with two decimals", () => {
    expect(money(199)).toBe("$199.00");
    expect(money(0.5)).toBe("$0.50");
  });
});
