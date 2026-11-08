import { useMemo, useState } from "react";
import {
  ExpressShipping,
  FreeOverThresholdShipping,
  ShippingCalculator,
  StandardShipping,
  StorePickup,
  money,
  type ShippingStrategy,
} from "./shipping.ts";

// Strategies are stateless, so they can be created once, outside the component.
const STRATEGIES: ShippingStrategy[] = [
  new StandardShipping(),
  new ExpressShipping(),
  new FreeOverThresholdShipping(100, new StandardShipping()),
  new StorePickup(),
];

/**
 * React usage: the selected strategy is just state. The component never
 * branches on "which shipping method is this?" — it delegates to the strategy.
 */
export default function StrategyDemo() {
  const [subtotal, setSubtotal] = useState(80);
  const [weightKg, setWeightKg] = useState(4);
  const [selected, setSelected] = useState(0);

  const calculator = useMemo(() => new ShippingCalculator(STRATEGIES[0]), []);
  calculator.strategy = STRATEGIES[selected];
  const cost = calculator.quote({ subtotal, weightKg });

  return (
    <section>
      <h2>Strategy — Shipping cost calculator</h2>
      <label>
        Subtotal ($){" "}
        <input type="number" value={subtotal} onChange={(e) => setSubtotal(Number(e.target.value))} />
      </label>{" "}
      <label>
        Weight (kg){" "}
        <input type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} />
      </label>
      <fieldset>
        <legend>Shipping method (strategy)</legend>
        {STRATEGIES.map((s, i) => (
          <label key={s.name} style={{ display: "block" }}>
            <input type="radio" name="shipping" checked={selected === i} onChange={() => setSelected(i)} />{" "}
            {s.name}
          </label>
        ))}
      </fieldset>
      <p>
        Shipping cost: <strong>{money(cost)}</strong>
      </p>
    </section>
  );
}
