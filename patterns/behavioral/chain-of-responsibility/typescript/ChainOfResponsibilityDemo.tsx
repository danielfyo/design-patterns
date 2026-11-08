import { useRef, useState } from "react";
import { buildPipeline, formatResponse, type Handler } from "./middleware.ts";

const TOKENS = new Map([
  ["token-alice", "alice"],
  ["token-bob", "bob"],
]);
const TOKEN_OPTIONS = ["token-alice", "token-bob", "forged-token", "(none)"];
const LIMIT = 3;

interface Entry {
  readonly title: string;
  readonly lines: string[];
  readonly result: string;
}

/**
 * React usage: the pipeline is built once (kept in a ref so the rate limiter's
 * counters survive re-renders) and the component only talks to its head.
 * Each handler writes to a logger we inject, so the trace shows exactly how far
 * the request travelled before a handler short-circuited it.
 */
export default function ChainOfResponsibilityDemo() {
  const trace = useRef<string[]>([]);
  const pipeline = useRef<Handler | null>(null);
  pipeline.current ??= buildPipeline(TOKENS, LIMIT, (line) => trace.current.push(line.trim()));

  const [token, setToken] = useState(TOKEN_OPTIONS[0]);
  const [ip, setIp] = useState("10.0.0.1");
  const [path, setPath] = useState("/orders");
  const [body, setBody] = useState("2x coffee");
  const [entries, setEntries] = useState<Entry[]>([]);

  const send = () => {
    trace.current = [];
    const request = { method: "POST", path, ip, body, token: token === "(none)" ? null : token };
    const response = pipeline.current!.handle(request);
    const entry = { title: `POST ${path} from ${ip}`, lines: trace.current, result: formatResponse(response) };
    setEntries((prev) => [entry, ...prev]);
  };

  const reset = () => {
    pipeline.current = buildPipeline(TOKENS, LIMIT, (line) => trace.current.push(line.trim()));
    setEntries([]);
  };

  return (
    <section>
      <h2>Chain of Responsibility — HTTP request middleware pipeline</h2>
      <p>
        Authentication → RateLimit ({LIMIT} per IP) → Validation → OrderController
      </p>
      <label>
        Token{" "}
        <select value={token} onChange={(e) => setToken(e.target.value)}>
          {TOKEN_OPTIONS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>{" "}
      <label>
        IP <input value={ip} onChange={(e) => setIp(e.target.value)} size={10} />
      </label>{" "}
      <label>
        Path <input value={path} onChange={(e) => setPath(e.target.value)} size={10} />
      </label>{" "}
      <label>
        Body <input value={body} onChange={(e) => setBody(e.target.value)} size={12} />
      </label>{" "}
      <button onClick={send}>Send</button> <button onClick={reset}>Reset rate limiter</button>
      {entries.map((entry, i) => (
        <div key={entries.length - i} style={{ borderTop: "1px solid #ccc", marginTop: 8 }}>
          <strong>{entry.title}</strong>
          <ul style={{ margin: 0 }}>
            {entry.lines.map((line, j) => (
              <li key={j}>{line}</li>
            ))}
          </ul>
          <code>{entry.result}</code>
        </div>
      ))}
    </section>
  );
}
