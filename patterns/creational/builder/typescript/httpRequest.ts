/**
 * Builder pattern: an HTTP request builder with a fluent interface,
 * validation in build() and a director with ready-made recipes.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (BuilderDemo.tsx).
 */

/** Plain description of the parts, used to create the product. */
export interface HttpRequestParts {
  readonly method: string;
  readonly url: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly query: ReadonlyMap<string, string>;
  readonly body: string | null;
  readonly timeoutSeconds: number;
}

const sortedEntries = (map: ReadonlyMap<string, string>): [string, string][] =>
  [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/**
 * Product: an immutable HTTP request. It has many optional parts, which is
 * exactly why constructing it directly is painful. Create it via HttpRequestBuilder.
 */
export class HttpRequest implements HttpRequestParts {
  readonly method: string;
  readonly url: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly query: ReadonlyMap<string, string>;
  readonly body: string | null;
  readonly timeoutSeconds: number;

  constructor(parts: HttpRequestParts) {
    this.method = parts.method;
    this.url = parts.url;
    // Defensive copies, sorted by key: later changes to the builder cannot leak in.
    this.headers = new Map(sortedEntries(parts.headers));
    this.query = new Map(sortedEntries(parts.query));
    this.body = parts.body;
    this.timeoutSeconds = parts.timeoutSeconds;
    Object.freeze(this);
  }

  /** Deterministic, human-readable rendering (keys are sorted). */
  toString(): string {
    const qs = [...this.query].map(([k, v]) => `${k}=${v}`).join("&");
    const lines = [`${this.method} ${this.url}${qs ? `?${qs}` : ""}`];
    for (const [name, value] of this.headers) lines.push(`  ${name}: ${value}`);
    lines.push(`  timeout: ${this.timeoutSeconds}s`);
    lines.push(`  body: ${this.body ?? "(none)"}`);
    return lines.join("\n");
  }
}

/**
 * Builder: collects the parts step by step through a fluent interface, then
 * validates everything at once in build() and returns the product.
 */
export class HttpRequestBuilder {
  #method = "GET";
  #url: string | null = null;
  readonly #headers = new Map<string, string>();
  readonly #query = new Map<string, string>();
  #body: string | null = null;
  #timeoutSeconds = 30;

  method(method: string): this {
    this.#method = method.toUpperCase();
    return this;
  }
  url(url: string): this {
    this.#url = url;
    return this;
  }
  header(name: string, value: string): this {
    this.#headers.set(name, value);
    return this;
  }
  query(name: string, value: string): this {
    this.#query.set(name, value);
    return this;
  }
  body(body: string): this {
    this.#body = body;
    return this;
  }
  timeout(seconds: number): this {
    this.#timeoutSeconds = seconds;
    return this;
  }

  /** Validates the combination of parts and creates an immutable snapshot. */
  build(): HttpRequest {
    if (!this.#url) throw new Error("url is required");
    if (this.#body !== null && (this.#method === "GET" || this.#method === "HEAD")) {
      throw new Error(`${this.#method} requests cannot have a body`);
    }
    if (this.#timeoutSeconds <= 0) throw new Error("timeout must be positive");
    return new HttpRequest({
      method: this.#method,
      url: this.#url,
      headers: this.#headers,
      query: this.#query,
      body: this.#body,
      timeoutSeconds: this.#timeoutSeconds,
    });
  }
}

/**
 * Director: knows the recipes for common requests. Each preset drives the
 * builder through a fixed sequence of steps and hands it back, so the caller
 * can still add steps before calling build().
 */
export const RequestDirector = {
  jsonPost(url: string, body: string): HttpRequestBuilder {
    return new HttpRequestBuilder()
      .method("POST")
      .url(url)
      .header("Accept", "application/json")
      .header("Content-Type", "application/json")
      .body(body);
  },

  authenticatedGet(url: string, token: string): HttpRequestBuilder {
    return new HttpRequestBuilder()
      .method("GET")
      .url(url)
      .header("Authorization", `Bearer ${token}`)
      .header("Accept", "application/json");
  },
} as const;
