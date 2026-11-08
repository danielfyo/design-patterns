/**
 * Observer pattern: a stock ticker notifies its subscribers of price changes.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (ObserverDemo.tsx).
 */

export type Log = (line: string) => void;

/** The Observer interface: anything that wants to hear about price changes. */
export interface StockObserver {
  update(symbol: string, price: number): void;
}

export const money = (amount: number): string => `$${amount.toFixed(2)}`;

/**
 * The Subject: keeps the latest prices and a list of observers, and notifies
 * all of them whenever a price changes. It knows nothing about what they do.
 */
export class StockTicker {
  readonly #observers: StockObserver[] = [];
  readonly #prices = new Map<string, number>();

  constructor(private readonly log: Log = console.log) {}

  /** Subscribes an observer and returns a function that unsubscribes it. */
  subscribe(observer: StockObserver): () => void {
    this.#observers.push(observer);
    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer: StockObserver): void {
    const index = this.#observers.indexOf(observer);
    if (index >= 0) this.#observers.splice(index, 1);
  }

  getPrice(symbol: string): number | undefined {
    return this.#prices.get(symbol);
  }

  setPrice(symbol: string, price: number): void {
    this.#prices.set(symbol, price);
    this.log(`[ticker] ${symbol} = ${money(price)} (notifying ${this.#observers.length} observers)`);
    this.#notify(symbol, price);
  }

  #notify(symbol: string, price: number): void {
    // Iterate over a copy so observers may unsubscribe while being notified.
    for (const observer of [...this.#observers]) observer.update(symbol, price);
  }
}

/** Concrete Observer: shows every price it receives. */
export class PriceDisplay implements StockObserver {
  constructor(private readonly log: Log = console.log) {}

  update(symbol: string, price: number): void {
    this.log(`  [display] ${symbol}: ${money(price)}`);
  }
}

/** Concrete Observer: reacts only when one symbol goes above a threshold. */
export class PriceAlert implements StockObserver {
  constructor(
    readonly symbol: string,
    readonly threshold: number,
    private readonly log: Log = console.log,
  ) {}

  update(symbol: string, price: number): void {
    if (symbol === this.symbol && price > this.threshold) {
      this.log(`  [alert] ${symbol} is above ${money(this.threshold)}: now ${money(price)}`);
    }
  }
}

/**
 * Concrete Observer with its own state: remembers the last price of each
 * holding and recomputes the portfolio value when one of them changes.
 */
export class PortfolioTracker implements StockObserver {
  readonly #lastPrices = new Map<string, number>();

  constructor(
    private readonly holdings: ReadonlyMap<string, number>,
    private readonly log: Log = console.log,
  ) {}

  get value(): number {
    let total = 0;
    for (const [symbol, shares] of this.holdings) total += (this.#lastPrices.get(symbol) ?? 0) * shares;
    return total;
  }

  update(symbol: string, price: number): void {
    if (!this.holdings.has(symbol)) return;
    this.#lastPrices.set(symbol, price);
    this.log(`  [portfolio] value: ${money(this.value)}`);
  }
}
