import { useMemo, useRef, useState, type ComponentType } from "react";
import {
  CachingFetcher,
  FetchError,
  HttpFetcher,
  LoggingFetcher,
  RetryFetcher,
  type DataFetcher,
  type Log,
} from "./fetchers.ts";

interface StackOptions {
  logging: boolean;
  caching: boolean;
  retry: boolean;
}

/**
 * Custom hook: builds the decorator stack from the enabled concerns.
 * The rest of the UI only sees a DataFetcher; it never knows what is wrapped.
 * The stack is rebuilt (fresh cache, fresh fake server) when the options change.
 */
function useFetcher(options: StackOptions, log: Log): DataFetcher {
  const { logging, caching, retry } = options;
  return useMemo(() => {
    let fetcher: DataFetcher = new HttpFetcher({ "/users": 2, "/orders": 3 }, log);
    if (retry) fetcher = new RetryFetcher(fetcher, 3, log);
    if (caching) fetcher = new CachingFetcher(fetcher, log);
    if (logging) fetcher = new LoggingFetcher(fetcher, log);
    return fetcher;
  }, [logging, caching, retry, log]);
}

/** Higher-order component: React's own "decorator" for components — adds a frame around any component. */
function withFrame<P extends object>(Inner: ComponentType<P>, title: string) {
  return function Framed(props: P) {
    return (
      <div style={{ border: "1px solid #999", borderRadius: 4, padding: 8, marginTop: 8 }}>
        <strong>{title}</strong>
        <Inner {...props} />
      </div>
    );
  };
}

function TraceList({ lines }: { lines: string[] }) {
  return <pre style={{ margin: 0 }}>{lines.join("\n") || "(nothing yet)"}</pre>;
}
const FramedTrace = withFrame(TraceList, "Trace (innermost calls appear in between outer ones)");

/** React usage: toggle decorators on and off and watch the trace of each fetch. */
export default function DecoratorDemo() {
  const [options, setOptions] = useState<StackOptions>({ logging: true, caching: true, retry: true });
  const [lines, setLines] = useState<string[]>([]);
  const buffer = useRef<string[]>([]);
  const log = useMemo<Log>(() => (line) => buffer.current.push(line), []);
  const fetcher = useFetcher(options, log);

  const run = (url: string) => {
    buffer.current = [];
    try {
      log(`result: ${fetcher.fetch(url)}`);
    } catch (err) {
      log(`error: ${err instanceof FetchError ? err.message : String(err)}`);
    }
    setLines(buffer.current);
  };

  const toggle = (key: keyof StackOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  return (
    <section>
      <h2>Decorator — Data fetcher with cross-cutting concerns</h2>
      <p>The fake server fails /users twice and /orders three times (reset when you change the stack).</p>
      {(["logging", "caching", "retry"] as const).map((key) => (
        <label key={key} style={{ marginRight: 12 }}>
          <input type="checkbox" checked={options[key]} onChange={() => toggle(key)} /> {key}
        </label>
      ))}
      <div style={{ marginTop: 8 }}>
        <button onClick={() => run("/users")}>GET /users</button>{" "}
        <button onClick={() => run("/orders")}>GET /orders</button>
      </div>
      <FramedTrace lines={lines} />
    </section>
  );
}
