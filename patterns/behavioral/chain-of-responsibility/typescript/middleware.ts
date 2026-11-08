/**
 * Chain of Responsibility pattern: an HTTP request middleware pipeline.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (ChainOfResponsibilityDemo.tsx).
 */

/** The request that travels along the chain. `user` is set by authentication. */
export interface Request {
  readonly method: string;
  readonly path: string;
  readonly token: string | null;
  readonly ip: string;
  readonly body: string;
  user?: string;
}

/** The result produced by whichever handler ends the chain. */
export interface Response {
  readonly status: number;
  readonly message: string;
}

const REASONS: Record<number, string> = {
  200: "OK",
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  429: "Too Many Requests",
};

export const formatResponse = (r: Response): string =>
  `${r.status} ${REASONS[r.status] ?? "Unknown"} - ${r.message}`;

/** Where handlers write their trace lines (console by default, a list in React). */
export type Logger = (line: string) => void;

/**
 * Handler: the common interface of every link in the chain.
 * `setNext` returns the handler it receives so chains can be built fluently.
 */
export interface Handler {
  setNext(next: Handler): Handler;
  handle(request: Request): Response;
}

/**
 * Base Handler: stores the successor and, by default, forwards the request to it.
 * If nobody handled the request by the end of the chain, it answers 404.
 */
export abstract class BaseHandler implements Handler {
  private next: Handler | null = null;

  constructor(protected readonly log: Logger = console.log) {}

  setNext(next: Handler): Handler {
    this.next = next;
    return next;
  }

  handle(request: Request): Response {
    return this.next?.handle(request) ?? { status: 404, message: `No handler for ${request.path}` };
  }
}

/** Concrete Handler: rejects requests without a known token (401). */
export class AuthenticationHandler extends BaseHandler {
  constructor(
    private readonly tokens: ReadonlyMap<string, string>,
    log?: Logger,
  ) {
    super(log);
  }

  override handle(request: Request): Response {
    if (request.token === null) {
      this.log("  [Authentication] rejected: missing token");
      return { status: 401, message: "Missing token" };
    }
    const user = this.tokens.get(request.token);
    if (user === undefined) {
      this.log("  [Authentication] rejected: invalid token");
      return { status: 401, message: "Invalid token" };
    }
    request.user = user;
    this.log(`  [Authentication] ok, user=${user}`);
    return super.handle(request);
  }
}

/**
 * Concrete Handler: allows at most `limit` requests per IP (429 afterwards).
 * The in-memory counter keeps the demo deterministic (no clock, no time window).
 */
export class RateLimitHandler extends BaseHandler {
  private readonly counts = new Map<string, number>();

  constructor(
    private readonly limit: number,
    log?: Logger,
  ) {
    super(log);
  }

  override handle(request: Request): Response {
    const count = (this.counts.get(request.ip) ?? 0) + 1;
    this.counts.set(request.ip, count);
    if (count > this.limit) {
      this.log(`  [RateLimit] rejected: ${request.ip} exceeded ${this.limit} requests`);
      return { status: 429, message: "Rate limit exceeded" };
    }
    this.log(`  [RateLimit] ${request.ip} request ${count}/${this.limit}`);
    return super.handle(request);
  }
}

/** Concrete Handler: rejects requests with an empty body (400). */
export class ValidationHandler extends BaseHandler {
  override handle(request: Request): Response {
    if (request.body.trim() === "") {
      this.log("  [Validation] rejected: empty body");
      return { status: 400, message: "Body must not be empty" };
    }
    this.log("  [Validation] ok");
    return super.handle(request);
  }
}

/**
 * Concrete Handler at the end of the chain: the endpoint. It handles only its
 * own route and passes anything else on (which ends in the base 404).
 */
export class OrderController extends BaseHandler {
  override handle(request: Request): Response {
    if (request.path !== "/orders") {
      this.log("  [OrderController] not my route, passing on");
      return super.handle(request);
    }
    this.log("  [OrderController] order accepted");
    return { status: 200, message: `Order accepted for ${request.user}: ${request.body}` };
  }
}

/** Builds the demo pipeline and returns its head (the only thing a client needs). */
export function buildPipeline(tokens: ReadonlyMap<string, string>, limit: number, log?: Logger): Handler {
  const head = new AuthenticationHandler(tokens, log);
  head
    .setNext(new RateLimitHandler(limit, log))
    .setNext(new ValidationHandler(log))
    .setNext(new OrderController(log));
  return head;
}
