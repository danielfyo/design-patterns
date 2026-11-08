import { useMemo, useState } from "react";
import { createShop, money, type OrderItem, type OrderResult } from "./shop.ts";

/**
 * React usage: the component only knows the facade. One click calls
 * `placeOrder`; inventory, payment, shipping and e-mail stay hidden behind it.
 * (In real apps the facade is often a service module or a custom hook such as
 * `useCheckout()` that components call instead of talking to several APIs.)
 */
export default function FacadeDemo() {
  // The shop lives as long as the component, so stock changes persist between orders.
  const { shop, inventory, lines } = useMemo(() => {
    const lines: string[] = [];
    return { ...createShop((line) => lines.push(line)), lines };
  }, []);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(inventory.skus.map((sku) => [sku, 0])),
  );
  const [result, setResult] = useState<OrderResult | null>(null);
  const [trace, setTrace] = useState<string[]>([]);

  const placeOrder = () => {
    lines.length = 0;
    const items: OrderItem[] = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([sku, quantity]) => ({ sku, quantity }));
    setResult(shop.placeOrder({ name: "Alice", email: "alice@example.com" }, items, "4242 4242 4242 4242"));
    setTrace([...lines]);
  };

  return (
    <section>
      <h2>Facade — E-commerce order placement</h2>
      <table>
        <tbody>
          {inventory.skus.map((sku) => (
            <tr key={sku}>
              <td>{sku}</td>
              <td>{money(inventory.priceOf(sku))}</td>
              <td>{inventory.stockOf(sku)} in stock</td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={quantities[sku]}
                  onChange={(e) => setQuantities({ ...quantities, [sku]: Number(e.target.value) })}
                  style={{ width: 60 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={placeOrder}>Place order</button>
      {result && (
        <p>
          {result.success ? (
            <strong>
              Confirmed: {money(result.total)}, tracking {result.tracking}
            </strong>
          ) : (
            <strong style={{ color: "crimson" }}>Failed: {result.error}</strong>
          )}
        </p>
      )}
      <pre>{trace.join("\n")}</pre>
    </section>
  );
}
