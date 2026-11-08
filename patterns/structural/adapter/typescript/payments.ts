/**
 * Adapter pattern: plugging an incompatible third-party payment SDK into our checkout.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (AdapterDemo.tsx).
 */

/** Outcome of a payment, in the application's own vocabulary. */
export interface PaymentResult {
  readonly success: boolean;
  readonly transactionId: string | null;
  readonly message: string;
}

/** Where the participants write their trace lines (console by default, a UI log in React). */
export type Log = (line: string) => void;
const consoleLog: Log = (line) => console.log(line);

/** Target: the interface the application wants to work with (decimal amounts, ISO currencies). */
export interface PaymentProcessor {
  readonly name: string;
  pay(amount: number, currency: string): PaymentResult;
}

/** A native implementation of the Target: our own wallet needs no adapter. */
export class InternalWalletProcessor implements PaymentProcessor {
  readonly name = "Internal wallet";
  #nextId = 1;

  constructor(
    private balance: number,
    private readonly log: Log = consoleLog,
  ) {}

  pay(amount: number, currency: string): PaymentResult {
    if (amount > this.balance) {
      this.log(`    [wallet] insufficient balance: ${this.balance.toFixed(2)} < ${amount.toFixed(2)}`);
      return { success: false, transactionId: null, message: "Insufficient wallet balance" };
    }
    const before = this.balance;
    this.balance -= amount;
    this.log(
      `    [wallet] debit ${amount.toFixed(2)} ${currency} (balance ${before.toFixed(2)} -> ${this.balance.toFixed(2)})`,
    );
    const id = `WAL-${String(this.#nextId++).padStart(4, "0")}`;
    return { success: true, transactionId: id, message: "Paid from wallet" };
  }
}

/**
 * Adaptee: a (fictional) third-party SDK we cannot change. Its API is incompatible with ours:
 * integer cents, a merchant id on every call, and a "code|reference" string as the response.
 */
export class LegacyPayProSdk {
  static readonly #maxAmountInCents = 50_000;
  static readonly #supportedCurrencies = ["USD", "EUR"];
  #nextReference = 1;

  constructor(private readonly log: Log = consoleLog) {}

  /** Returns "00|PP-000001" on success, "14|" unsupported currency, "51|" over the limit. */
  makeTransaction(amountInCents: number, currencyCode: string, merchantId: string): string {
    let response: string;
    if (!LegacyPayProSdk.#supportedCurrencies.includes(currencyCode)) response = "14|";
    else if (amountInCents > LegacyPayProSdk.#maxAmountInCents) response = "51|";
    else response = `00|PP-${String(this.#nextReference++).padStart(6, "0")}`;

    this.log(`    [paypro-sdk] makeTransaction(${amountInCents}, "${currencyCode}", "${merchantId}") -> "${response}"`);
    return response;
  }
}

/**
 * Adapter (object adapter): implements the Target and wraps an Adaptee instance, translating
 * dollars to cents on the way in and status codes to PaymentResult on the way out.
 */
export class PayProAdapter implements PaymentProcessor {
  readonly name = "PayPro (adapted)";

  constructor(
    private readonly sdk: LegacyPayProSdk,
    private readonly merchantId: string,
    private readonly log: Log = consoleLog,
  ) {}

  pay(amount: number, currency: string): PaymentResult {
    const cents = Math.round(amount * 100);
    this.log(`    [adapter] ${amount.toFixed(2)} ${currency} -> ${cents} cents, merchant ${this.merchantId}`);

    const [code, reference] = this.sdk.makeTransaction(cents, currency, this.merchantId).split("|");
    switch (code) {
      case "00":
        return { success: true, transactionId: reference, message: "Approved" };
      case "14":
        return { success: false, transactionId: null, message: "Currency not supported by PayPro" };
      case "51":
        return { success: false, transactionId: null, message: "Declined: amount over limit" };
      default:
        return { success: false, transactionId: null, message: `Unknown PayPro status ${code}` };
    }
  }
}

/** Client: only knows PaymentProcessor, so any gateway (native or adapted) plugs in. */
export class CheckoutService {
  constructor(
    private readonly processor: PaymentProcessor,
    private readonly log: Log = consoleLog,
  ) {}

  checkout(orderId: string, amount: number, currency: string): PaymentResult {
    this.log(`  Order ${orderId}: ${amount.toFixed(2)} ${currency}`);
    const result = this.processor.pay(amount, currency);
    this.log(
      `    result: success=${result.success}, id=${result.transactionId ?? "-"}, message=${result.message}`,
    );
    return result;
  }
}
