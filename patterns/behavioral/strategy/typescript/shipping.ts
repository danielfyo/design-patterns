/**
 * Strategy pattern: interchangeable shipping cost algorithms.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (StrategyDemo.tsx).
 */

export interface Order {
  readonly subtotal: number;
  readonly weightKg: number;
}

/** The Strategy interface: every algorithm exposes the same contract. */
export interface ShippingStrategy {
  readonly name: string;
  calculate(order: Order): number;
}

/** Concrete strategy: flat fee plus a per-kilogram rate. */
export class StandardShipping implements ShippingStrategy {
  readonly name = "Standard";
  calculate(order: Order): number {
    return 5 + 1.5 * order.weightKg;
  }
}

/** Concrete strategy: faster, so more expensive. */
export class ExpressShipping implements ShippingStrategy {
  readonly name = "Express";
  calculate(order: Order): number {
    return 15 + 3 * order.weightKg;
  }
}

/** Concrete strategy that composes another one: free above a threshold. */
export class FreeOverThresholdShipping implements ShippingStrategy {
  readonly name: string;
  constructor(
    private readonly threshold: number,
    private readonly fallback: ShippingStrategy,
  ) {
    this.name = `Free over $${threshold}`;
  }
  calculate(order: Order): number {
    return order.subtotal >= this.threshold ? 0 : this.fallback.calculate(order);
  }
}

/** Concrete strategy: the customer collects the parcel. */
export class StorePickup implements ShippingStrategy {
  readonly name = "Store pickup";
  calculate(): number {
    return 0;
  }
}

/** The Context: delegates the computation to the current strategy. */
export class ShippingCalculator {
  constructor(public strategy: ShippingStrategy) {}

  quote(order: Order): number {
    return this.strategy.calculate(order);
  }
}

/** In TypeScript a strategy can also be just a function with the same signature. */
export type ShippingFn = (order: Order) => number;

export const money = (amount: number): string => `$${amount.toFixed(2)}`;
