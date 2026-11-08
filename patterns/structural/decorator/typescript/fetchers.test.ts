import { describe, expect, it } from "vitest";
import {
  CachingFetcher,
  FetchError,
  FetcherDecorator,
  HttpFetcher,
  LoggingFetcher,
  RetryFetcher,
  type DataFetcher,
} from "./fetchers.ts";

const USERS_BODY = '{"users":["ada","linus"]}';

/** Collects trace lines in memory instead of printing them. */
function recorder() {
  const lines: string[] = [];
  return { lines, log: (line: string) => lines.push(line) };
}

const countStartingWith = (lines: string[], prefix: string) => lines.filter((l) => l.startsWith(prefix)).length;

/** A test double that counts how often the wrapped component is reached. */
class CountingFetcher extends FetcherDecorator {
  calls = 0;

  override fetch(url: string): string {
    this.calls++;
    return super.fetch(url);
  }
}

describe("Decorator: data fetcher with cross-cutting concerns", () => {
  it("returns canned bodies and an empty object for unknown URLs", () => {
    const { log } = recorder();
    const http = new HttpFetcher({}, log);

    expect(http.fetch("/users")).toBe(USERS_BODY);
    expect(http.fetch("/unknown")).toBe("{}");
  });

  it("retries transient failures until the call succeeds", () => {
    const { lines, log } = recorder();
    const fetcher = new RetryFetcher(new HttpFetcher({ "/users": 2 }, log), 3, log);

    expect(fetcher.fetch("/users")).toBe(USERS_BODY);
    expect(countStartingWith(lines, "[http] GET /users")).toBe(3);
  });

  it("gives up after the maximum number of attempts and rethrows", () => {
    const { lines, log } = recorder();
    const fetcher = new RetryFetcher(new HttpFetcher({ "/orders": 3 }, log), 2, log);

    expect(() => fetcher.fetch("/orders")).toThrow(FetchError);
    expect(countStartingWith(lines, "[http] GET /orders")).toBe(2);
    expect(lines).toContain("[retry] attempt 2/2 failed: 503 Service Unavailable, giving up");
  });

  it("does not retry errors that are not fetch failures", () => {
    const { log } = recorder();
    let calls = 0;
    const broken: DataFetcher = {
      fetch: () => {
        calls++;
        throw new TypeError("bug");
      },
    };

    expect(() => new RetryFetcher(broken, 3, log).fetch("/users")).toThrow(TypeError);
    expect(calls).toBe(1);
  });

  it("serves repeated requests from the cache without reaching the wrapped component", () => {
    const { lines, log } = recorder();
    const counter = new CountingFetcher(new HttpFetcher({}, log), log);
    const fetcher = new CachingFetcher(counter, log);

    expect(fetcher.fetch("/users")).toBe(fetcher.fetch("/users"));
    expect(counter.calls).toBe(1);
    expect(lines).toContain("[cache] hit /users");
  });

  it("does not cache failures", () => {
    const { lines, log } = recorder();
    const fetcher = new CachingFetcher(new HttpFetcher({ "/users": 1 }, log), log);

    expect(() => fetcher.fetch("/users")).toThrow(FetchError);
    expect(fetcher.fetch("/users")).toBe(USERS_BODY);
    expect(lines).not.toContain("[cache] hit /users");
  });

  it("logs errors and rethrows them unchanged", () => {
    const { lines, log } = recorder();
    const fetcher = new LoggingFetcher(new HttpFetcher({ "/users": 1 }, log), log);

    expect(() => fetcher.fetch("/users")).toThrow("503 Service Unavailable");
    expect(lines).toContain("[log] error /users: 503 Service Unavailable");
  });

  it.each([
    ["logging outside retry sees one call", true, 1, 0],
    ["logging inside retry sees every attempt", false, 3, 2],
  ])("order matters: %s", (_name, loggingOutside, fetchLines, errorLines) => {
    const { lines, log } = recorder();
    const http = new HttpFetcher({ "/users": 2 }, log);
    const fetcher = loggingOutside
      ? new LoggingFetcher(new RetryFetcher(http, 3, log), log)
      : new RetryFetcher(new LoggingFetcher(http, log), 3, log);

    fetcher.fetch("/users");

    expect(countStartingWith(lines, "[log] fetch /users")).toBe(fetchLines);
    expect(countStartingWith(lines, "[log] error /users")).toBe(errorLines);
  });

  it("answers the second call without any HTTP request when the cache is outside the retry", () => {
    const { lines, log } = recorder();
    const fetcher = new CachingFetcher(new RetryFetcher(new HttpFetcher({ "/users": 2 }, log), 3, log), log);
    fetcher.fetch("/users");
    lines.length = 0;

    expect(fetcher.fetch("/users")).toBe(USERS_BODY);
    expect(lines.some((l) => l.startsWith("[http]"))).toBe(false);
  });
});
