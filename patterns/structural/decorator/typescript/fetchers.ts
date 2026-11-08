/**
 * Decorator pattern: cross-cutting concerns (logging, caching, retries)
 * stacked around a data fetcher. Framework-agnostic core, reused by the
 * console demo (main.ts) and the React demo (DecoratorDemo.tsx).
 */

/** Where participants write their trace lines (console by default, React state in the UI). */
export type Log = (line: string) => void;

/** Raised when a (simulated) HTTP request fails. */
export class FetchError extends Error {
  override readonly name = "FetchError";
}

/** The Component interface: anything that can fetch the body of a URL. */
export interface DataFetcher {
  fetch(url: string): string;
}

const RESPONSES: Record<string, string> = {
  "/users": '{"users":["ada","linus"]}',
  "/orders": '{"orders":[101,102]}',
};

/**
 * Concrete Component: an in-memory fake HTTP client. It returns canned bodies
 * and fails the first N calls for selected URLs, so retries are deterministic.
 */
export class HttpFetcher implements DataFetcher {
  private readonly remainingFailures: Map<string, number>;

  constructor(
    failFirst: Record<string, number> = {},
    private readonly log: Log = console.log,
  ) {
    this.remainingFailures = new Map(Object.entries(failFirst));
  }

  fetch(url: string): string {
    this.log(`[http] GET ${url}`);
    const left = this.remainingFailures.get(url) ?? 0;
    if (left > 0) {
      this.remainingFailures.set(url, left - 1);
      throw new FetchError("503 Service Unavailable");
    }
    return RESPONSES[url] ?? "{}";
  }
}

/**
 * Base Decorator: implements the component interface and forwards every call
 * to the wrapped component. Concrete decorators override what they need.
 */
export abstract class FetcherDecorator implements DataFetcher {
  constructor(
    protected readonly inner: DataFetcher,
    protected readonly log: Log = console.log,
  ) {}

  fetch(url: string): string {
    return this.inner.fetch(url);
  }
}

/** Concrete Decorator: logs every call and its outcome. */
export class LoggingFetcher extends FetcherDecorator {
  override fetch(url: string): string {
    this.log(`[log] fetch ${url}`);
    try {
      const body = super.fetch(url);
      this.log(`[log] ok ${url} (${body.length} chars)`);
      return body;
    } catch (err) {
      if (err instanceof FetchError) this.log(`[log] error ${url}: ${err.message}`);
      throw err;
    }
  }
}

/** Concrete Decorator: remembers successful responses by URL. */
export class CachingFetcher extends FetcherDecorator {
  private readonly cache = new Map<string, string>();

  override fetch(url: string): string {
    const cached = this.cache.get(url);
    if (cached !== undefined) {
      this.log(`[cache] hit ${url}`);
      return cached;
    }
    this.log(`[cache] miss ${url}`);
    const body = super.fetch(url);
    this.cache.set(url, body);
    this.log(`[cache] stored ${url}`);
    return body;
  }
}

/** Concrete Decorator: retries failed calls up to `maxAttempts` times. */
export class RetryFetcher extends FetcherDecorator {
  constructor(
    inner: DataFetcher,
    private readonly maxAttempts: number,
    log: Log = console.log,
  ) {
    super(inner, log);
  }

  override fetch(url: string): string {
    for (let attempt = 1; ; attempt++) {
      try {
        return super.fetch(url);
      } catch (err) {
        if (!(err instanceof FetchError)) throw err;
        const last = attempt >= this.maxAttempts;
        this.log(
          `[retry] attempt ${attempt}/${this.maxAttempts} failed: ${err.message}, ${last ? "giving up" : "retrying"}`,
        );
        if (last) throw err;
      }
    }
  }
}
