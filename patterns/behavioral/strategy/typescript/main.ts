// Run with: npx tsx patterns/behavioral/strategy/typescript/main.ts
import {
  ExpressShipping,
  FreeOverThresholdShipping,
  ShippingCalculator,
  StandardShipping,
  StorePickup,
  money,
  type Order,
  type ShippingStrategy,
} from "./shipping.ts";

console.log("=== Strategy Pattern: Shipping cost calculator ===");

const strategies: ShippingStrategy[] = [
  new StandardShipping(),
  new ExpressShipping(),
  new FreeOverThresholdShipping(100, new StandardShipping()),
  new StorePickup(),
];
const orders: Order[] = [
  { subtotal: 80, weightKg: 4 },
  { subtotal: 150, weightKg: 4 },
];

// The same calculator is reused; only the strategy changes at runtime.
const calculator = new ShippingCalculator(strategies[0]);

for (const order of orders) {
  console.log(`Order: subtotal=${money(order.subtotal)}, weight=${order.weightKg.toFixed(1)}kg`);
  for (const strategy of strategies) {
    calculator.strategy = strategy;
    console.log(`  ${strategy.name.padEnd(16)} -> ${money(calculator.quote(order))}`);
  }
}
