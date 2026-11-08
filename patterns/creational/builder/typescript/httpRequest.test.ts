import { describe, expect, it } from "vitest";
import { HttpRequestBuilder, RequestDirector } from "./httpRequest.ts";

const url = "https://api.example.com/users";

describe("Builder: HTTP request builder", () => {
  it("applies sensible defaults to unset parts", () => {
    const request = new HttpRequestBuilder().url(url).build();

    expect(request.method).toBe("GET");
    expect(request.url).toBe(url);
    expect(request.headers.size).toBe(0);
    expect(request.query.size).toBe(0);
    expect(request.body).toBeNull();
    expect(request.timeoutSeconds).toBe(30);
  });

  it("collects every part through fluent steps and renders keys in sorted order", () => {
    const request = new HttpRequestBuilder()
      .method("put")
      .url(url)
      .header("x-trace", "1")
      .header("Accept", "text/plain")
      .header("Accept", "application/json")
      .query("sort", "name")
      .query("page", "2")
      .body("{}")
      .timeout(5)
      .build();

    expect(request.toString()).toBe(
      [
        "PUT https://api.example.com/users?page=2&sort=name",
        "  Accept: application/json",
        "  x-trace: 1",
        "  timeout: 5s",
        "  body: {}",
      ].join("\n"),
    );
  });

  it.each([
    ["no url", () => new HttpRequestBuilder().method("GET"), "url is required"],
    ["GET with body", () => new HttpRequestBuilder().url(url).body("{}"), "GET requests cannot have a body"],
    ["HEAD with body", () => new HttpRequestBuilder().method("head").url(url).body("{}"), "HEAD requests cannot have a body"],
    ["timeout 0", () => new HttpRequestBuilder().url(url).timeout(0), "timeout must be positive"],
    ["negative timeout", () => new HttpRequestBuilder().url(url).timeout(-1), "timeout must be positive"],
  ])("validates the combination of parts: %s", (_scenario, make, error) => {
    expect(() => make().build()).toThrow(error);
  });

  it("returns a snapshot unaffected by later builder steps", () => {
    const builder = new HttpRequestBuilder().url(url).header("Accept", "application/json");
    const first = builder.build();

    const second = builder.header("X-Debug", "true").query("page", "3").timeout(1).build();

    expect(first.headers.size).toBe(1);
    expect(first.query.size).toBe(0);
    expect(first.timeoutSeconds).toBe(30);
    expect(second.headers.size).toBe(2);
    expect(second.query.get("page")).toBe("3");
  });

  it("freezes the built request", () => {
    const request = new HttpRequestBuilder().url(url).build();

    expect(Object.isFrozen(request)).toBe(true);
    expect(() => {
      (request as { url: string }).url = "https://evil.example.com";
    }).toThrow(TypeError);
  });

  it("drives the builder through the JSON POST preset", () => {
    const request = RequestDirector.jsonPost("https://api.example.com/orders", '{"qty":2}').build();

    expect(request.method).toBe("POST");
    expect(request.headers.get("Accept")).toBe("application/json");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.body).toBe('{"qty":2}');
  });

  it("hands back a builder that accepts extra steps after a preset", () => {
    const request = RequestDirector.authenticatedGet("https://api.example.com/me", "t0k")
      .query("lang", "en")
      .timeout(10)
      .build();

    expect(request.method).toBe("GET");
    expect(request.headers.get("Authorization")).toBe("Bearer t0k");
    expect(request.query.get("lang")).toBe("en");
    expect(request.timeoutSeconds).toBe(10);
    expect(request.body).toBeNull();
  });

  it("starts every director call from a fresh builder", () => {
    const first = RequestDirector.authenticatedGet(url, "a");
    const second = RequestDirector.authenticatedGet(url, "b");

    first.header("X-Only-First", "1");

    expect(second.build().headers.has("X-Only-First")).toBe(false);
    expect(first).not.toBe(second);
  });
});
