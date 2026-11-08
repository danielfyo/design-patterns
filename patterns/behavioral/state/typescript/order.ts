/**
 * State pattern: an order whose behavior changes with its lifecycle state.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (StateDemo.tsx).
 */

export type Logger = (line: string) => void;

/** The action names, handy for UIs and reducers. */
export type OrderAction = "pay" | "ship" | "deliver" | "cancel";

/**
 * The Context: delegates every action to its current state object.
 * No `switch` on a status field — the state decides what happens.
 */
export class Order {
  #state: OrderState;

  constructor(
    readonly id: number,
    initialState: OrderState = new PendingState(),
    readonly log: Logger = console.log,
  ) {
    this.#state = initialState;
  }

  get state(): OrderState {
    return this.#state;
  }

  pay(): void {
    this.log("> pay()");
    this.#state.pay(this);
  }

  ship(): void {
    this.log("> ship()");
    this.#state.ship(this);
  }

  deliver(): void {
    this.log("> deliver()");
    this.#state.deliver(this);
  }

  cancel(): void {
    this.log("> cancel()");
    this.#state.cancel(this);
  }

  /** Called by the states themselves: states know their successors. */
  transitionTo(next: OrderState, note: string): void {
    this.log(`  ${note}: ${this.#state.name} -> ${next.name}`);
    this.#state = next;
  }
}

/**
 * The State: one method per action of the context. Each concrete state decides
 * which actions are valid and which state comes next.
 */
export abstract class OrderState {
  abstract readonly name: string;
  abstract pay(order: Order): void;
  abstract ship(order: Order): void;
  abstract deliver(order: Order): void;
  abstract cancel(order: Order): void;

  /** Shared helper for invalid actions: the state stays the same. */
  protected reject(order: Order, reason: string): void {
    order.log(`  ERROR: ${reason}`);
  }
}

/** Concrete State: created but not paid yet. */
export class PendingState extends OrderState {
  readonly name = "Pending";
  override pay(order: Order): void {
    order.transitionTo(new PaidState(), "Payment accepted");
  }
  override ship(order: Order): void {
    this.reject(order, "Cannot ship an order that has not been paid");
  }
  override deliver(order: Order): void {
    this.reject(order, "Cannot deliver an order that has not been shipped");
  }
  override cancel(order: Order): void {
    order.transitionTo(new CancelledState(), "Order cancelled, nothing to refund");
  }
}

/** Concrete State: paid and waiting to be shipped. */
export class PaidState extends OrderState {
  readonly name = "Paid";
  override pay(order: Order): void {
    this.reject(order, "Order has already been paid");
  }
  override ship(order: Order): void {
    order.transitionTo(new ShippedState(), "Order handed to the carrier");
  }
  override deliver(order: Order): void {
    this.reject(order, "Cannot deliver an order that has not been shipped");
  }
  override cancel(order: Order): void {
    order.transitionTo(new CancelledState(), "Order cancelled, payment refunded");
  }
}

/** Concrete State: on its way to the customer. */
export class ShippedState extends OrderState {
  readonly name = "Shipped";
  override pay(order: Order): void {
    this.reject(order, "Order has already been paid");
  }
  override ship(order: Order): void {
    this.reject(order, "Order has already been shipped");
  }
  override deliver(order: Order): void {
    order.transitionTo(new DeliveredState(), "Order delivered to the customer");
  }
  override cancel(order: Order): void {
    this.reject(order, "Cannot cancel an order that has already been shipped");
  }
}

/** Concrete State: final state, every action is rejected. */
export class DeliveredState extends OrderState {
  readonly name = "Delivered";
  override pay(order: Order): void {
    this.reject(order, "Order has already been paid");
  }
  override ship(order: Order): void {
    this.reject(order, "Order has already been delivered");
  }
  override deliver(order: Order): void {
    this.reject(order, "Order has already been delivered");
  }
  override cancel(order: Order): void {
    this.reject(order, "Cannot cancel a delivered order");
  }
}

/** Concrete State: final state reached by cancelling. */
export class CancelledState extends OrderState {
  readonly name = "Cancelled";
  override pay(order: Order): void {
    this.reject(order, "Cannot pay for a cancelled order");
  }
  override ship(order: Order): void {
    this.reject(order, "Cannot ship a cancelled order");
  }
  override deliver(order: Order): void {
    this.reject(order, "Cannot deliver a cancelled order");
  }
  override cancel(order: Order): void {
    this.reject(order, "Order is already cancelled");
  }
}
