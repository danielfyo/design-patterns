import { describe, expect, it } from "vitest";
import {
  PortfolioTracker,
  PriceAlert,
  PriceDisplay,
  StockTicker,
  money,
  type StockObserver,
} from "./ticker.ts";

/** An observer that records every notification it gets. */
class Recorder implements StockObserver {
  readonly updates: [string, number][] = [];

  update(symbol: string, price: number): void {
    this.updates.push([symbol, price]);
  }
}

const quietTicker = () => {
  const log: string[] = [];
  return { ticker: new StockTicker((line) => log.push(line)), log };
};

describe("Observer: stock price ticker", () => {
  it("notifies every subscriber of a price change", () => {
    const { ticker, log } = quietTicker();
    const first = new Recorder();
    const second = new Recorder();
    ticker.subscribe(first);
    ticker.subscribe(second);

    ticker.setPrice("AAPL", 195.5);

    expect(first.updates).toEqual([["AAPL", 195.5]]);
    expect(second.updates).toEqual([["AAPL", 195.5]]);
    expect(log).toEqual(["[ticker] AAPL = $195.50 (notifying 2 observers)"]);
  });

  it("stops notifying after unsubscribe", () => {
    const { ticker } = quietTicker();
    const observer = new Recorder();
    ticker.subscribe(observer);
    ticker.setPrice("AAPL", 1);

    ticker.unsubscribe(observer);
    ticker.setPrice("AAPL", 2);

    expect(observer.updates).toEqual([["AAPL", 1]]);
  });

  it("returns an unsubscribe function from subscribe that is safe to call twice", () => {
    const { ticker } = quietTicker();
    const observer = new Recorder();
    const unsubscribe = ticker.subscribe(observer);

    unsubscribe();
    unsubscribe();
    ticker.setPrice("AAPL", 1);

    expect(observer.updates).toEqual([]);
  });

  it("lets an observer unsubscribe while being notified without skipping others", () => {
    const { ticker } = quietTicker();
    let calls = 0;
    const oneShot: StockObserver = {
      update: () => {
        calls++;
        ticker.unsubscribe(oneShot);
      },
    };
    const recorder = new Recorder();
    ticker.subscribe(oneShot);
    ticker.subscribe(recorder);

    ticker.setPrice("AAPL", 1);
    ticker.setPrice("AAPL", 2);

    expect(calls).toBe(1);
    expect(recorder.updates).toHaveLength(2);
  });

  it("remembers the latest price of each symbol", () => {
    const { ticker } = quietTicker();

    ticker.setPrice("AAPL", 1);
    ticker.setPrice("AAPL", 2);

    expect(ticker.getPrice("AAPL")).toBe(2);
    expect(ticker.getPrice("GOOG")).toBeUndefined();
  });

  it.each([
    ["AAPL", 201.25, true],
    ["AAPL", 200, false],
    ["AAPL", 150, false],
    ["MSFT", 999, false],
  ])(
    "fires the alert for %s at %d only above its threshold (%s)",
    (symbol, price, fires) => {
      const log: string[] = [];
      const alert = new PriceAlert("AAPL", 200, (line) => log.push(line));

      alert.update(symbol, price);

      expect(log.length > 0).toBe(fires);
    },
  );

  it("values the portfolio from its holdings and ignores other symbols", () => {
    const { ticker } = quietTicker();
    const lines: string[] = [];
    const portfolio = new PortfolioTracker(
      new Map([
        ["AAPL", 10],
        ["MSFT", 5],
      ]),
      (line) => lines.push(line),
    );
    ticker.subscribe(portfolio);
    expect(portfolio.value).toBe(0);

    ticker.setPrice("AAPL", 195.5);
    ticker.setPrice("MSFT", 410.2);
    ticker.setPrice("GOOG", 172.4);

    expect(money(portfolio.value)).toBe("$4006.00");
    expect(lines).toEqual([
      "  [portfolio] value: $1955.00",
      "  [portfolio] value: $4006.00",
    ]);
  });

  it("shows every price on the display observer", () => {
    const lines: string[] = [];
    new PriceDisplay((line) => lines.push(line)).update("MSFT", 410.2);

    expect(lines).toEqual(["  [display] MSFT: $410.20"]);
  });
});
