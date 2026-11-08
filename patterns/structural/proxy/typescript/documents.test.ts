import { describe, expect, it } from "vitest";
import {
  AccessDeniedError,
  DocumentStoreProxy,
  RemoteDocumentStore,
  withCallLogging,
  type DocumentStore,
  type User,
} from "./documents.ts";

const editor: User = { name: "alice", role: "editor" };
const viewer: User = { name: "bob", role: "viewer" };

function setup() {
  const lines: string[] = [];
  return { lines, proxy: new DocumentStoreProxy((line) => lines.push(line)) };
}

describe("Proxy: document store proxy", () => {
  it("does not create the real store until the first request", () => {
    const { proxy, lines } = setup();

    expect(proxy.isRealStoreCreated).toBe(false);
    expect(lines).toEqual([]);

    proxy.getDocument("doc-1", editor);

    expect(proxy.isRealStoreCreated).toBe(true);
  });

  it("creates the real store only once", () => {
    const { proxy, lines } = setup();

    proxy.getDocument("doc-1", editor);
    proxy.getDocument("doc-2", editor);

    expect(lines.filter((l) => l.startsWith("[remote] connecting"))).toHaveLength(1);
  });

  it("fetches each document from the remote store once", () => {
    const { proxy, lines } = setup();
    const store: DocumentStore = proxy;

    const first = store.getDocument("doc-1", editor);
    const second = store.getDocument("doc-1", viewer);

    expect(second).toBe(first);
    expect(lines.filter((l) => l === "[remote] fetching doc-1")).toHaveLength(1);
    expect(proxy.requests).toBe(2);
    expect(proxy.remoteFetches).toBe(1);
  });

  it("denies viewers confidential documents", () => {
    const { proxy } = setup();

    expect(() => proxy.getDocument("doc-2", viewer)).toThrow(
      new AccessDeniedError("viewer cannot read confidential doc-2"),
    );
  });

  it("lets editors read confidential documents", () => {
    const { proxy } = setup();

    expect(proxy.getDocument("doc-2", editor)).toEqual({
      id: "doc-2",
      title: "Merger plan",
      classification: "confidential",
    });
  });

  it("checks permissions even when the document is cached", () => {
    const { proxy } = setup();
    proxy.getDocument("doc-2", editor);

    expect(() => proxy.getDocument("doc-2", viewer)).toThrow(AccessDeniedError);
    expect(proxy.remoteFetches).toBe(1);
    expect(proxy.requests).toBe(2);
  });

  it("still warms the cache on a denied request", () => {
    const { proxy, lines } = setup();
    expect(() => proxy.getDocument("doc-2", viewer)).toThrow(AccessDeniedError);

    proxy.getDocument("doc-2", editor);

    expect(proxy.remoteFetches).toBe(1);
    expect(lines).toContain("[proxy] cache hit doc-2");
  });

  it("does not cache unknown documents", () => {
    const { proxy } = setup();

    expect(() => proxy.getDocument("doc-404", editor)).toThrow("document doc-404 not found");
    expect(proxy.remoteFetches).toBe(0);
  });

  it("relies on the proxy for authorization because the real subject has none", () => {
    const real = new RemoteDocumentStore(() => {});

    expect(real.getDocument("doc-2", viewer).classification).toBe("confidential");
  });

  it("wraps any object in a built-in Proxy that logs method calls", () => {
    const { proxy, lines } = setup();
    const store = withCallLogging<DocumentStore>(proxy, (line) => lines.push(line));

    const doc = store.getDocument("doc-1", editor);

    expect(doc.title).toBe("Q3 roadmap");
    expect(lines[0]).toBe('[js-proxy] getDocument("doc-1", {"name":"alice","role":"editor"})');
    expect((store as DocumentStoreProxy).requests).toBe(1);
  });
});
