// Run with: npx tsx patterns/creational/builder/typescript/main.ts
import { HttpRequestBuilder, RequestDirector, type HttpRequest } from "./httpRequest.ts";

console.log("=== Builder Pattern: HTTP request builder ===");

const show = (request: HttpRequest): void => console.log(`  ${request.toString().replaceAll("\n", "\n  ")}`);

console.log("1) Step by step with the fluent builder:");
show(
  new HttpRequestBuilder()
    .url("https://api.example.com/users")
    .header("X-Request-Id", "req-001")
    .header("Accept", "application/json")
    .query("sort", "name")
    .query("page", "2")
    .timeout(5)
    .build(),
);

console.log("2) Director preset jsonPost(url, body):");
show(RequestDirector.jsonPost("https://api.example.com/orders", '{"sku":"A-42","qty":2}').build());

console.log("3) Preset authenticatedGet(url, token) + extra steps:");
show(
  RequestDirector.authenticatedGet("https://api.example.com/me", "demo-token-123")
    .query("lang", "en")
    .query("fields", "name,email")
    .timeout(10)
    .build(),
);

console.log("4) build() validates before creating the product:");
const invalid: [label: string, make: () => HttpRequestBuilder][] = [
  ["no url", () => new HttpRequestBuilder().method("GET")],
  ["GET with body", () => new HttpRequestBuilder().url("https://api.example.com/users").body("{}")],
  ["timeout 0", () => RequestDirector.jsonPost("https://api.example.com/orders", "{}").timeout(0)],
];
for (const [label, make] of invalid) {
  try {
    make().build();
    console.log(`  ${label.padEnd(13)} -> built`);
  } catch (err) {
    console.log(`  ${label.padEnd(13)} -> error: ${(err as Error).message}`);
  }
}

console.log("5) Built requests are immutable snapshots:");
const builder = RequestDirector.authenticatedGet("https://api.example.com/me", "demo-token-123");
const first = builder.build();
const second = builder.header("X-Debug", "true").build();
console.log(`  first has ${first.headers.size} headers, second has ${second.headers.size} headers`);
