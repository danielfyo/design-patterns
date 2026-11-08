import { useState } from "react";
import { HttpRequestBuilder, RequestDirector } from "./httpRequest.ts";

type Preset = "none" | "jsonPost" | "authenticatedGet";

/**
 * React usage: form fields are the builder's steps. On every render the
 * component replays them on a fresh builder (starting from a director preset if
 * one is chosen) and calls build(), showing either the immutable request or the
 * validation error. Try a GET with a body, or an empty URL.
 */
export default function BuilderDemo() {
  const [preset, setPreset] = useState<Preset>("none");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.example.com/users");
  const [headerName, setHeaderName] = useState("X-Request-Id");
  const [headerValue, setHeaderValue] = useState("req-001");
  const [query, setQuery] = useState("page=2");
  const [body, setBody] = useState("");
  const [timeout, setTimeoutSeconds] = useState(30);

  const builder =
    preset === "jsonPost"
      ? RequestDirector.jsonPost(url, body || "{}")
      : preset === "authenticatedGet"
        ? RequestDirector.authenticatedGet(url, "demo-token-123")
        : new HttpRequestBuilder().method(method).url(url);
  if (headerName) builder.header(headerName, headerValue);
  const [qKey, qValue] = query.split("=");
  if (qKey) builder.query(qKey, qValue ?? "");
  if (preset === "none" && body) builder.body(body);
  builder.timeout(timeout);

  let output: string;
  let failed = false;
  try {
    output = builder.build().toString();
  } catch (err) {
    output = `error: ${(err as Error).message}`;
    failed = true;
  }

  const row = { display: "block", marginBottom: "0.25rem" } as const;
  return (
    <section>
      <h2>Builder — HTTP request builder</h2>
      <label style={row}>
        Director preset{" "}
        <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
          <option value="none">none (step by step)</option>
          <option value="jsonPost">jsonPost(url, body)</option>
          <option value="authenticatedGet">authenticatedGet(url, token)</option>
        </select>
      </label>
      <label style={row}>
        Method{" "}
        <select value={method} disabled={preset !== "none"} onChange={(e) => setMethod(e.target.value)}>
          {["GET", "POST", "PUT", "DELETE", "HEAD"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label style={row}>
        URL <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: "20rem" }} />
      </label>
      <label style={row}>
        Header <input value={headerName} onChange={(e) => setHeaderName(e.target.value)} />{" "}
        <input value={headerValue} onChange={(e) => setHeaderValue(e.target.value)} />
      </label>
      <label style={row}>
        Query (key=value) <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <label style={row}>
        Body <input value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"sku":"A-42"}' />
      </label>
      <label style={row}>
        Timeout (s){" "}
        <input type="number" value={timeout} onChange={(e) => setTimeoutSeconds(Number(e.target.value))} />
      </label>
      <pre style={{ background: failed ? "#fee2e2" : "#f5f5f5", padding: "0.5rem" }}>{output}</pre>
    </section>
  );
}
