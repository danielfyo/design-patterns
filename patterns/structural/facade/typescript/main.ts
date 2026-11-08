// Run with: npx tsx patterns/structural/facade/typescript/main.ts
import { createShop, money, type Customer, type OrderItem } from "./shop.ts";

console.log("=== Facade Pattern: E-commerce order placement ===");

const { shop, inventory } = createShop();

// The client makes ONE call per order; the facade does the orchestration.
function placeAndReport(n: number, customer: Customer, items: OrderItem[]): void {
  console.log(`Order ${n}: ${customer.name} buys ${items.map((i) => `${i.quantity} x ${i.sku}`).join(", ")}`);
  const result = shop.placeOrder(customer, items, "4242 4242 4242 4242");
  console.log(
    result.success
      ? `Result: success=true, total=${money(result.total)}, tracking=${result.tracking}`
      : `Result: success=false, error=${result.error}`,
  );
}

placeAndReport(1, { name: "Alice", email: "alice@example.com" }, [
  { sku: "keyboard", quantity: 2 },
  { sku: "mouse", quantity: 1 },
]);
console.log();
placeAndReport(2, { name: "Bob", email: "bob@example.com" }, [
  { sku: "monitor", quantity: 1 },
  { sku: "webcam", quantity: 5 },
]);
console.log();

const skus = ["keyboard", "mouse", "monitor", "webcam"];
console.log(`Stock after both orders: ${skus.map((s) => `${s}=${inventory.stockOf(s)}`).join(", ")}`);
