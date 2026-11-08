import { describe, expect, it } from "vitest";
import {
  ExpressShipping,
  FreeOverThresholdShipping,
  ShippingCalculator,
  StandardShipping,
  StorePickup,
  money,
  type Order,
  type ShippingFn,
} from "./shipping.ts";

const light: Order = { subtotal: 80, weightKg: 4 };
const big: Order = { subtotal: 150, weightKg: 4 };

describe("Strategy: shipping cost calculator", () => {
  it.each([
    [new StandardShipping(), 11],
    [new ExpressShipping(), 27],
    [new StorePickup(), 0],
  ])("%s prices the same order differently", (strategy, expected) => {
    expect(strategy.calculate(light)).toBe(expected);
  });

  it("falls back to the wrapped strategy below the threshold", () => {
    const strategy = new FreeOverThresholdShipping(100, new StandardShipping());

    expect(strategy.calculate(light)).toBe(11);
    expect(strategy.calculate(big)).toBe(0);
    expect(strategy.name).toBe("Free over $100");
  });

  it("delegates to the strategy swapped at runtime", () => {
    const calculator = new ShippingCalculator(new StandardShipping());
    expect(calculator.quote(light)).toBe(11);

    calculator.strategy = new ExpressShipping();

    expect(calculator.quote(light)).toBe(27);
  });

  it("accepts a plain function as a lightweight strategy", () => {
    const halfPrice: ShippingFn = (order) => new StandardShipping().calculate(order) / 2;

    expect(money(halfPrice(light))).toBe("$5.50");
  });
});
