import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PriceAlert, StockTicker, money } from "./ticker.ts";

// The Subject lives outside React: it is an "external store".
const ticker = new StockTicker(() => {});
ticker.setPrice("AAPL", 195.5);
ticker.setPrice("MSFT", 410.2);

const HOLDINGS = { AAPL: 10, MSFT: 5 } as const;
type SymbolName = keyof typeof HOLDINGS;

/**
 * useSyncExternalStore is React's built-in Observer adapter: `subscribe`
 * registers an observer and returns the unsubscribe function; React calls it on
 * mount and cleans up on unmount, and re-renders when the snapshot changes.
 */
function useStockPrice(symbol: SymbolName): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      ticker.subscribe({ update: (changed) => changed === symbol && onStoreChange() }),
    [symbol],
  );
  return useSyncExternalStore(subscribe, () => ticker.getPrice(symbol) ?? 0);
}

/** Concrete observer as a component: shows one price. */
function PriceDisplay({ symbol }: { symbol: SymbolName }) {
  const price = useStockPrice(symbol);
  return (
    <li>
      {symbol}: <strong>{money(price)}</strong>
    </li>
  );
}

/** Concrete observer as a component: recomputes the portfolio value. */
function Portfolio() {
  const aapl = useStockPrice("AAPL");
  const msft = useStockPrice("MSFT");
  return <p>Portfolio (10 AAPL, 5 MSFT): {money(aapl * HOLDINGS.AAPL + msft * HOLDINGS.MSFT)}</p>;
}

/** A plain (non-React) observer subscribed in an effect and unsubscribed on cleanup. */
function Alerts() {
  const [alerts, setAlerts] = useState<string[]>([]);
  useEffect(
    () => ticker.subscribe(new PriceAlert("AAPL", 200, (line) => setAlerts((a) => [...a.slice(-3), line.trim()]))),
    [],
  );
  return <pre style={{ color: "crimson", margin: 0 }}>{alerts.join("\n") || "No alerts (AAPL > $200.00)"}</pre>;
}

export default function ObserverDemo() {
  const [showDisplay, setShowDisplay] = useState(true);
  const nudge = (symbol: SymbolName, delta: number) =>
    ticker.setPrice(symbol, Math.round(((ticker.getPrice(symbol) ?? 0) + delta) * 100) / 100);

  return (
    <section>
      <h2>Observer — Stock price ticker</h2>
      {(Object.keys(HOLDINGS) as SymbolName[]).map((s) => (
        <span key={s} style={{ marginRight: 12 }}>
          {s} <button onClick={() => nudge(s, -2.5)}>−$2.50</button>{" "}
          <button onClick={() => nudge(s, 2.5)}>+$2.50</button>
        </span>
      ))}
      <p>
        <label>
          <input type="checkbox" checked={showDisplay} onChange={(e) => setShowDisplay(e.target.checked)} /> Price
          display subscribed (unmounting it unsubscribes)
        </label>
      </p>
      {showDisplay && (
        <ul>
          <PriceDisplay symbol="AAPL" />
          <PriceDisplay symbol="MSFT" />
        </ul>
      )}
      <Portfolio />
      <Alerts />
    </section>
  );
}
