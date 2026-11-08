// Run with: npx tsx patterns/behavioral/observer/typescript/main.ts
import { PortfolioTracker, PriceAlert, PriceDisplay, StockTicker } from "./ticker.ts";

console.log("=== Observer Pattern: Stock price ticker ===");

const ticker = new StockTicker();

// The subject only knows the StockObserver interface.
const unsubscribeDisplay = ticker.subscribe(new PriceDisplay());
ticker.subscribe(new PriceAlert("AAPL", 200));
ticker.subscribe(
  new PortfolioTracker(
    new Map([
      ["AAPL", 10],
      ["MSFT", 5],
    ]),
  ),
);

ticker.setPrice("AAPL", 195.5);
ticker.setPrice("MSFT", 410.2);
ticker.setPrice("AAPL", 201.25);

unsubscribeDisplay();
console.log("-- display unsubscribed --");

ticker.setPrice("AAPL", 203.1);
ticker.setPrice("GOOG", 172.4); // nobody cares about GOOG: no reactions
ticker.setPrice("MSFT", 398);
