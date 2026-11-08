import { describe, expect, it } from "vitest";
import {
  CancelledState,
  DeliveredState,
  Order,
  PaidState,
  PendingState,
  ShippedState,
  type OrderAction,
  type OrderState,
} from "./order.ts";

const factories: Record<string, () => OrderState> = {
  Pending: () => new PendingState(),
  Paid: () => new PaidState(),
  Shipped: () => new ShippedState(),
  Delivered: () => new DeliveredState(),
  Cancelled: () => new CancelledState(),
};

/** An order that starts in the given state and records what it logs. */
function orderIn(state: string): { order: Order; lines: string[] } {
  const lines: string[] = [];
  const order = new Order(1, factories[state](), (line) => lines.push(line));
  return { order, lines };
}

describe("State: order lifecycle", () => {
  it("starts a new order in the pending state", () => {
    const order = new Order(42, undefined, () => {});

    expect(order.id).toBe(42);
    expect(order.state).toBeInstanceOf(PendingState);
  });

  it("walks the happy path through every state until delivered", () => {
    const { order, lines } = orderIn("Pending");

    order.pay();
    expect(order.state).toBeInstanceOf(PaidState);
    order.ship();
    expect(order.state).toBeInstanceOf(ShippedState);
    order.deliver();

    expect(order.state).toBeInstanceOf(DeliveredState);
    expect(lines).toEqual([
      "> pay()",
      "  Payment accepted: Pending -> Paid",
      "> ship()",
      "  Order handed to the carrier: Paid -> Shipped",
      "> deliver()",
      "  Order delivered to the customer: Shipped -> Delivered",
    ]);
  });

  it.each([
    ["Pending", "Order cancelled, nothing to refund"],
    ["Paid", "Order cancelled, payment refunded"],
  ])("cancels a %s order before shipping", (from, note) => {
    const { order, lines } = orderIn(from);

    order.cancel();

    expect(order.state).toBeInstanceOf(CancelledState);
    expect(lines).toEqual(["> cancel()", `  ${note}: ${from} -> Cancelled`]);
  });

  it.each<[string, OrderAction, string]>([
    ["Pending", "ship", "Cannot ship an order that has not been paid"],
    ["Pending", "deliver", "Cannot deliver an order that has not been shipped"],
    ["Paid", "pay", "Order has already been paid"],
    ["Paid", "deliver", "Cannot deliver an order that has not been shipped"],
    ["Shipped", "ship", "Order has already been shipped"],
    ["Shipped", "cancel", "Cannot cancel an order that has already been shipped"],
    ["Delivered", "deliver", "Order has already been delivered"],
    ["Delivered", "cancel", "Cannot cancel a delivered order"],
    ["Cancelled", "pay", "Cannot pay for a cancelled order"],
    ["Cancelled", "cancel", "Order is already cancelled"],
  ])("rejects %s.%s() and keeps the state", (from, action, error) => {
    const { order, lines } = orderIn(from);
    const before = order.state;

    order[action]();

    expect(order.state).toBe(before);
    expect(lines).toEqual([`> ${action}()`, `  ERROR: ${error}`]);
  });

  it.each(["Delivered", "Cancelled"])("rejects every action in the final %s state", (final) => {
    const { order, lines } = orderIn(final);
    const before = order.state;

    for (const action of ["pay", "ship", "deliver", "cancel"] as const) order[action]();

    expect(order.state).toBe(before);
    expect(lines.filter((l) => l.includes("ERROR:"))).toHaveLength(4);
  });

  it("makes the same action behave differently depending on the state", () => {
    const pending = orderIn("Pending").order;
    const paid = orderIn("Paid").order;

    pending.ship();
    paid.ship();

    expect(pending.state).toBeInstanceOf(PendingState);
    expect(paid.state).toBeInstanceOf(ShippedState);
  });
});
