import { describe, expect, it } from "vitest";
import {
  AuthenticationHandler,
  BaseHandler,
  OrderController,
  RateLimitHandler,
  ValidationHandler,
  buildPipeline,
  formatResponse,
  type Request,
  type Response,
} from "./middleware.ts";

const TOKENS = new Map([
  ["token-alice", "alice"],
  ["token-bob", "bob"],
]);

const order = (overrides: Partial<Request> = {}): Request => ({
  method: "POST",
  path: "/orders",
  token: "token-alice",
  ip: "10.0.0.1",
  body: "2x coffee",
  ...overrides,
});

/** A handler that records how many requests reached it. */
class Probe extends BaseHandler {
  calls = 0;
  override handle(): Response {
    this.calls++;
    return { status: 200, message: "probe" };
  }
}

const silent = (): void => {};

describe("Chain of Responsibility: HTTP request middleware pipeline", () => {
  it("lets a valid request travel the whole chain and reach the controller", () => {
    const lines: string[] = [];

    const response = buildPipeline(TOKENS, 2, (line) => lines.push(line)).handle(order());

    expect(response).toEqual({ status: 200, message: "Order accepted for alice: 2x coffee" });
    expect(lines).toEqual([
      "  [Authentication] ok, user=alice",
      "  [RateLimit] 10.0.0.1 request 1/2",
      "  [Validation] ok",
      "  [OrderController] order accepted",
    ]);
  });

  it.each([
    [null, "Missing token"],
    ["forged-token", "Invalid token"],
  ])("short-circuits authentication for token %s without calling the next handler", (token, message) => {
    const probe = new Probe();
    const auth = new AuthenticationHandler(TOKENS, silent);
    auth.setNext(probe);

    expect(auth.handle(order({ token }))).toEqual({ status: 401, message });
    expect(probe.calls).toBe(0);
  });

  it("sets the authenticated user on the request for later handlers", () => {
    const request = order({ token: "token-bob" });
    const auth = new AuthenticationHandler(TOKENS, silent);
    auth.setNext(new Probe());

    auth.handle(request);

    expect(request.user).toBe("bob");
  });

  it("counts requests per IP and rejects once the limit is exceeded", () => {
    const probe = new Probe();
    const limiter = new RateLimitHandler(2, silent);
    limiter.setNext(probe);

    const statuses = ["10.0.0.1", "10.0.0.1", "10.0.0.1", "10.0.0.2"].map(
      (ip) => limiter.handle(order({ ip })).status,
    );

    expect(statuses).toEqual([200, 200, 429, 200]);
    expect(probe.calls).toBe(3);
  });

  it.each(["", "   "])("rejects the empty body %j before it reaches the controller", (body) => {
    const lines: string[] = [];

    const response = buildPipeline(TOKENS, 2, (line) => lines.push(line)).handle(order({ body }));

    expect(response).toEqual({ status: 400, message: "Body must not be empty" });
    expect(lines.some((line) => line.includes("[OrderController]"))).toBe(false);
  });

  it("answers 404 when the request falls off the end of the chain", () => {
    const lines: string[] = [];

    const response = buildPipeline(TOKENS, 2, (line) => lines.push(line)).handle(order({ path: "/invoices" }));

    expect(response).toEqual({ status: 404, message: "No handler for /invoices" });
    expect(lines).toContain("  [OrderController] not my route, passing on");
  });

  it("returns the received handler from setNext so chains can be built fluently", () => {
    const head = new ValidationHandler(silent);
    const next = new OrderController(silent);

    expect(head.setNext(next)).toBe(next);
  });

  it.each([
    [200, "200 OK - done"],
    [429, "429 Too Many Requests - done"],
    [418, "418 Unknown - done"],
  ])("formats a %i response with its reason", (status, expected) => {
    expect(formatResponse({ status, message: "done" })).toBe(expected);
  });
});
