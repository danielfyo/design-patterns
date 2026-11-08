import { useReducer } from "react";
import { Order, PendingState, type OrderAction, type OrderState } from "./order.ts";

interface DemoState {
  readonly orderState: OrderState;
  readonly log: readonly string[];
}

type DemoAction = { type: OrderAction } | { type: "reset" };

const ORDER_ID = 1001;
const ACTIONS: readonly OrderAction[] = ["pay", "ship", "deliver", "cancel"];

const initial = (): DemoState => ({
  orderState: new PendingState(),
  log: [`Order #${ORDER_ID} created [Pending]`],
});

/**
 * useReducer is itself a tiny state machine: (state, action) => next state.
 * Here the reducer does not branch on the status — it rebuilds the Context
 * around the current (immutable, stateless) State object and lets that object
 * decide. The reducer stays pure, so it is safe under StrictMode.
 */
function reducer(current: DemoState, action: DemoAction): DemoState {
  if (action.type === "reset") return initial();
  const lines: string[] = [];
  const order = new Order(ORDER_ID, current.orderState, (line) => lines.push(line));
  order[action.type]();
  return { orderState: order.state, log: [...current.log, ...lines] };
}

/** React usage: the order's lifecycle state lives in useReducer; buttons dispatch actions. */
export default function StateDemo() {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  return (
    <section>
      <h2>State — Order lifecycle</h2>
      <p>
        Order #{ORDER_ID} is <strong>{state.orderState.name}</strong>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {ACTIONS.map((a) => (
          <button key={a} onClick={() => dispatch({ type: a })}>
            {a}()
          </button>
        ))}
        <button onClick={() => dispatch({ type: "reset" })}>reset</button>
      </div>
      <pre style={{ background: "#f4f4f4", padding: 8 }}>{state.log.join("\n")}</pre>
    </section>
  );
}
