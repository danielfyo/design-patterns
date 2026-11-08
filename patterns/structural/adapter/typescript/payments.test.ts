import { describe, expect, it } from "vitest";
import {
  CheckoutService,
  InternalWalletProcessor,
  LegacyPayProSdk,
  PayProAdapter,
  type PaymentProcessor,
  type PaymentResult,
} from "./payments.ts";

const merchant = "MERCHANT-42";

/** Builds an adapter whose trace lines go into the returned array instead of the console. */
function newAdapter() {
  const lines: string[] = [];
  const log = (line: string) => lines.push(line);
  return { adapter: new PayProAdapter(new LegacyPayProSdk(log), merchant, log), lines };
}

const failure = (message: string): PaymentResult => ({ success: false, transactionId: null, message });

describe("Adapter: payment gateway integration", () => {
  it("is usable wherever the target interface is expected", () => {
    const processor: PaymentProcessor = newAdapter().adapter;

    expect(processor.name).toBe("PayPro (adapted)");
  });

  it("translates dollars to cents and adds the merchant id", () => {
    const { adapter, lines } = newAdapter();

    adapter.pay(49.99, "USD");

    expect(lines).toContain('    [paypro-sdk] makeTransaction(4999, "USD", "MERCHANT-42") -> "00|PP-000001"');
  });

  it("rounds half cents away from zero", () => {
    const { adapter, lines } = newAdapter();

    adapter.pay(10.125, "USD");

    expect(lines.join("\n")).toContain("makeTransaction(1013, ");
  });

  it("turns the approved code into a successful result with the SDK reference", () => {
    const { adapter } = newAdapter();

    expect(adapter.pay(10, "USD")).toEqual({ success: true, transactionId: "PP-000001", message: "Approved" });
    expect(adapter.pay(10, "EUR")).toEqual({ success: true, transactionId: "PP-000002", message: "Approved" });
  });

  it.each([
    [19.5, "GBP", "Currency not supported by PayPro"],
    [750, "USD", "Declined: amount over limit"],
  ])("turns an error code for %d %s into a readable failure", (amount, currency, message) => {
    expect(newAdapter().adapter.pay(amount, currency)).toEqual(failure(message));
  });

  it("still approves an amount exactly at the SDK limit", () => {
    expect(newAdapter().adapter.pay(500, "USD").success).toBe(true);
  });

  it("reports unknown SDK codes instead of crashing", () => {
    class BrokenSdk extends LegacyPayProSdk {
      override makeTransaction(): string {
        return "99|";
      }
    }

    const adapter = new PayProAdapter(new BrokenSdk(), merchant, () => {});

    expect(adapter.pay(1, "USD")).toEqual(failure("Unknown PayPro status 99"));
  });

  it("lets the wallet debit its balance and reject payments it cannot cover", () => {
    const wallet = new InternalWalletProcessor(100, () => {});

    expect(wallet.pay(49.99, "USD")).toEqual({ success: true, transactionId: "WAL-0001", message: "Paid from wallet" });
    expect(wallet.pay(75, "USD")).toEqual(failure("Insufficient wallet balance"));
    expect(wallet.pay(50.01, "USD")).toEqual({ success: true, transactionId: "WAL-0002", message: "Paid from wallet" });
  });

  it("checks out against any target implementation", () => {
    const calls: [number, string][] = [];
    const recording: PaymentProcessor = {
      name: "Recording",
      pay(amount, currency) {
        calls.push([amount, currency]);
        return { success: true, transactionId: "REC-1", message: "Recorded" };
      },
    };
    const lines: string[] = [];

    const result = new CheckoutService(recording, (line) => lines.push(line)).checkout("A-1", 12.5, "EUR");

    expect(calls).toEqual([[12.5, "EUR"]]);
    expect(result.transactionId).toBe("REC-1");
    expect(lines).toEqual(["  Order A-1: 12.50 EUR", "    result: success=true, id=REC-1, message=Recorded"]);
  });

  it("runs the same checkout code unchanged against the adapted SDK", () => {
    const { adapter, lines } = newAdapter();

    const result = new CheckoutService(adapter, (line) => lines.push(line)).checkout("A-1004", 19.5, "GBP");

    expect(result.success).toBe(false);
    expect(lines).toEqual([
      "  Order A-1004: 19.50 GBP",
      "    [adapter] 19.50 GBP -> 1950 cents, merchant MERCHANT-42",
      '    [paypro-sdk] makeTransaction(1950, "GBP", "MERCHANT-42") -> "14|"',
      "    result: success=false, id=-, message=Currency not supported by PayPro",
    ]);
  });
});
