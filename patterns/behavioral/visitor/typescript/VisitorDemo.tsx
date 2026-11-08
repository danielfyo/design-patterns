import { useState } from "react";
import {
  Book,
  Electronics,
  Food,
  ReceiptPrinter,
  ShippingCostCalculator,
  TaxCalculator,
  money,
  type CartItem,
  type CartVisitor,
  type Logger,
} from "./cart.ts";

// Elements are immutable, so the catalog can live outside the component.
const CATALOG: CartItem[] = [
  new Book("Clean Code", 32.5, 0.8),
  new Electronics("Headphones", 59.9, 0.4),
  new Food("Coffee beans", 12, 1.5),
  new Electronics("Monitor", 199, 5.5),
  new Food("Chocolate", 3.5, 0.2),
];

// Each operation is a visitor. Adding a new operation = adding one entry here.
const OPERATIONS: { label: string; create: (log: Logger) => CartVisitor & { total: number } }[] = [
  { label: "ReceiptPrinter", create: (log) => new ReceiptPrinter(log) },
  { label: "TaxCalculator", create: (log) => new TaxCalculator(log) },
  { label: "ShippingCostCalculator", create: (log) => new ShippingCostCalculator(log) },
];

/** A visitor can even be an object literal: here it answers "what kind of item is this?". */
function kindOf(item: CartItem): string {
  let kind = "";
  item.accept({
    visitBook: () => {
      kind = "Book";
    },
    visitElectronics: () => {
      kind = "Electronics";
    },
    visitFood: () => {
      kind = "Food";
    },
  });
  return kind;
}

/**
 * React usage: the cart items never change; the user picks which operation
 * (visitor) to run over them. The visitor is created during render from the
 * current state, so the output is always derived, never stored.
 */
export default function VisitorDemo() {
  const [inCart, setInCart] = useState<boolean[]>(() => CATALOG.map(() => true));
  const [operation, setOperation] = useState(0);

  const lines: string[] = [];
  const visitor = OPERATIONS[operation].create((line) => lines.push(line));
  CATALOG.filter((_, i) => inCart[i]).forEach((item) => item.accept(visitor));

  return (
    <section>
      <h2>Visitor — Shopping cart: tax &amp; shipping</h2>
      <fieldset>
        <legend>Cart (elements)</legend>
        {CATALOG.map((item, i) => (
          <label key={item.name} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={inCart[i]}
              onChange={() => setInCart(inCart.map((v, j) => (j === i ? !v : v)))}
            />{" "}
            {kindOf(item)}: {item.name} ({money(item.price)}, {item.weightKg} kg)
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Operation (visitor)</legend>
        {OPERATIONS.map((op, i) => (
          <label key={op.label} style={{ marginRight: 12 }}>
            <input type="radio" name="visitor" checked={operation === i} onChange={() => setOperation(i)} /> {op.label}
          </label>
        ))}
      </fieldset>
      <pre style={{ background: "#f4f4f4", padding: 8 }}>{lines.join("\n") || "(empty cart)"}</pre>
      <p>
        Total: <strong>{money(visitor.total)}</strong>
      </p>
    </section>
  );
}
