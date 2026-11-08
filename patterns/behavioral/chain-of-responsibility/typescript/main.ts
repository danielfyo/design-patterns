// Run with: npx tsx patterns/behavioral/chain-of-responsibility/typescript/main.ts
import { buildPipeline, formatResponse, type Request } from "./middleware.ts";

console.log("=== Chain of Responsibility Pattern: HTTP request middleware pipeline ===");

const tokens = new Map([
  ["token-alice", "alice"],
  ["token-bob", "bob"],
]);

// buildPipeline chains the handlers fluently: each setNext returns the handler it was given.
const pipeline = buildPipeline(tokens, 2);
console.log("Pipeline: Authentication -> RateLimit(2 per IP) -> Validation -> OrderController");

const req = (path: string, token: string | null, ip: string, body: string): Request => ({
  method: "POST",
  path,
  token,
  ip,
  body,
});

const requests: Request[] = [
  req("/orders", "token-alice", "10.0.0.1", "2x coffee"),
  req("/orders", null, "10.0.0.2", "1x tea"),
  req("/orders", "forged-token", "10.0.0.2", "1x tea"),
  req("/orders", "token-alice", "10.0.0.1", ""),
  req("/orders", "token-alice", "10.0.0.1", "1x tea"),
  req("/orders", "token-bob", "10.0.0.3", "3x muffin"),
  req("/invoices", "token-bob", "10.0.0.3", "invoice #42"),
];

requests.forEach((r, i) => {
  console.log(`Request ${i + 1}: ${r.method} ${r.path} ip=${r.ip} token=${r.token ?? "(none)"} body="${r.body}"`);
  // The client only knows the head of the chain.
  const response = pipeline.handle(r);
  console.log(`  => ${formatResponse(response)}`);
});
