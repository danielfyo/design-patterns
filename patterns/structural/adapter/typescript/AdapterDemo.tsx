import { useRef, useState } from "react";
import {
  CheckoutService,
  InternalWalletProcessor,
  LegacyPayProSdk,
  PayProAdapter,
  type Log,
  type PaymentProcessor,
} from "./payments.ts";

/** Builds both processors once; their trace lines go into a buffer the component renders. */
function createProcessors(log: Log): PaymentProcessor[] {
  return [new InternalWalletProcessor(100, log), new PayProAdapter(new LegacyPayProSdk(log), "MERCHANT-42", log)];
}

/**
 * React usage: the UI picks a PaymentProcessor and hands it to CheckoutService.
 * Neither the component nor the service knows that one of them is a wrapped legacy SDK.
 */
export default function AdapterDemo() {
  const buffer = useRef<string[]>([]);
  const processors = useRef<PaymentProcessor[] | null>(null);
  processors.current ??= createProcessors((line) => buffer.current.push(line));

  const [amount, setAmount] = useState(49.99);
  const [currency, setCurrency] = useState("USD");
  const [selected, setSelected] = useState(1);
  const [orderNo, setOrderNo] = useState(1001);
  const [log, setLog] = useState<string[]>([]);

  function pay() {
    buffer.current = [];
    const processor = processors.current![selected];
    new CheckoutService(processor, (line) => buffer.current.push(line)).checkout(`A-${orderNo}`, amount, currency);
    setLog((previous) => [`Checkout with ${processor.name}`, ...buffer.current, ...previous]);
    setOrderNo((n) => n + 1);
  }

  return (
    <section>
      <h2>Adapter — Payment gateway integration</h2>
      <label>
        Amount{" "}
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </label>{" "}
      <label>
        Currency{" "}
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {["USD", "EUR", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Payment processor (all implement PaymentProcessor)</legend>
        {processors.current.map((p, i) => (
          <label key={p.name} style={{ display: "block" }}>
            <input type="radio" name="processor" checked={selected === i} onChange={() => setSelected(i)} /> {p.name}
          </label>
        ))}
      </fieldset>
      <button onClick={pay}>Pay</button>
      <pre style={{ background: "#f4f4f4", padding: 8, minHeight: 80 }}>{log.join("\n")}</pre>
    </section>
  );
}
