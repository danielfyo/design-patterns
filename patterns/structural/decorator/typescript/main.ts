// Run with: npx tsx patterns/structural/decorator/typescript/main.ts
import {
  CachingFetcher,
  FetchError,
  HttpFetcher,
  LoggingFetcher,
  RetryFetcher,
  type DataFetcher,
} from "./fetchers.ts";

function show(fetcher: DataFetcher, url: string): void {
  try {
    console.log(`result: ${fetcher.fetch(url)}`);
  } catch (err) {
    if (!(err instanceof FetchError)) throw err;
    console.log(`error: ${err.message}`);
  }
}

console.log("=== Decorator Pattern: Data fetcher with cross-cutting concerns ===");

// Stack A: the cache sits outside the retry, so a cached URL never touches the network.
console.log("Stack A: Logging -> Caching -> Retry(3) -> Http");
const stackA: DataFetcher = new LoggingFetcher(
  new CachingFetcher(new RetryFetcher(new HttpFetcher({ "/users": 2 }), 3)),
);
show(stackA, "/users");
show(stackA, "/users");

// Stack B: same pieces, different order. Logging is inside the retry, so it sees every attempt.
console.log();
console.log("Stack B: Retry(3) -> Logging -> Http");
const stackB: DataFetcher = new RetryFetcher(new LoggingFetcher(new HttpFetcher({ "/users": 2 })), 3);
show(stackB, "/users");

// Stack C: retries are not magic. If the server keeps failing, the error reaches the client.
console.log();
console.log("Stack C: Retry(2) -> Http");
const stackC: DataFetcher = new RetryFetcher(new HttpFetcher({ "/orders": 3 }), 2);
show(stackC, "/orders");
