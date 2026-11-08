// Run with: npx tsx patterns/behavioral/visitor/typescript/main.ts
import {
  Book,
  Electronics,
  Food,
  ReceiptPrinter,
  ShippingCostCalculator,
  TaxCalculator,
  money,
  round2,
  type CartItem,
  type CartVisitor,
} from "./cart.ts";

console.log("=== Visitor Pattern: Shopping cart: tax & shipping ===");

const cart: CartItem[] = [
  new Book("Clean Code", 32.5, 0.8),
  new Electronics("Headphones", 59.9, 0.4),
  new Food("Coffee beans", 12, 1.5),
  new Electronics("Monitor", 199, 5.5),
  new Food("Chocolate", 3.5, 0.2),
];

// The traversal is always the same; each visitor is a different operation.
const visit = (visitor: CartVisitor): void => {
  for (const item of cart) item.accept(visitor);
};

console.log("--- ReceiptPrinter ---");
const receipt = new ReceiptPrinter();
visit(receipt);
console.log(`  Subtotal: ${money(receipt.total)}`);

console.log("--- TaxCalculator ---");
const tax = new TaxCalculator();
visit(tax);
console.log(`  Total tax: ${money(tax.total)}`);

console.log("--- ShippingCostCalculator ---");
const shipping = new ShippingCostCalculator();
visit(shipping);
console.log(`  Total shipping: ${money(shipping.total)}`);

const grand = round2(receipt.total + tax.total + shipping.total);
console.log(
  `Grand total: ${money(receipt.total)} + ${money(tax.total)} tax + ${money(shipping.total)} shipping = ${money(grand)}`,
);
