// Run with: npx tsx patterns/structural/adapter/typescript/main.ts
import {
  CheckoutService,
  InternalWalletProcessor,
  LegacyPayProSdk,
  PayProAdapter,
  type PaymentProcessor,
} from "./payments.ts";

console.log("=== Adapter Pattern: Payment gateway integration ===");

// The wallet implements PaymentProcessor natively; the legacy SDK is wrapped by an adapter.
const wallet: PaymentProcessor = new InternalWalletProcessor(100);
const payPro: PaymentProcessor = new PayProAdapter(new LegacyPayProSdk(), "MERCHANT-42");

type OrderLine = [id: string, amount: number, currency: string];
const runs: [PaymentProcessor, OrderLine[]][] = [
  [wallet, [["A-1001", 49.99, "USD"], ["A-1002", 75, "USD"]]],
  [payPro, [["A-1003", 49.99, "USD"], ["A-1004", 19.5, "GBP"], ["A-1005", 750, "USD"]]],
];

for (const [processor, orders] of runs) {
  console.log(`Checkout with ${processor.name}`);
  // The same CheckoutService code runs against both processors.
  const checkout = new CheckoutService(processor);
  for (const [id, amount, currency] of orders) {
    checkout.checkout(id, amount, currency);
  }
}
