/**
 * Proxy pattern: a document store proxy that is lazy (virtual proxy),
 * caches results (caching proxy) and checks roles (protection proxy).
 * Framework-agnostic core, reused by the console demo (main.ts) and the
 * React demo (ProxyDemo.tsx).
 */

/** Where participants write their trace lines (console by default, React state in the UI). */
export type Log = (line: string) => void;

export interface User {
  readonly name: string;
  readonly role: "viewer" | "editor";
}

export interface Document {
  readonly id: string;
  readonly title: string;
  readonly classification: "public" | "confidential";
}

/** Raised by the protection proxy when a user may not read a document. */
export class AccessDeniedError extends Error {
  override readonly name = "AccessDeniedError";
}

/**
 * The Subject interface: shared by the real store and the proxy, so clients
 * cannot tell (and do not care) which one they are talking to.
 */
export interface DocumentStore {
  getDocument(id: string, user: User): Document;
}

const DOCUMENTS: ReadonlyMap<string, Document> = new Map([
  ["doc-1", { id: "doc-1", title: "Q3 roadmap", classification: "public" }],
  ["doc-2", { id: "doc-2", title: "Merger plan", classification: "confidential" }],
]);

/**
 * The Real Subject: a remote document server. Expensive to create (it opens a
 * connection) and every call is a network round trip. It trusts its caller and
 * performs no authorization of its own.
 */
export class RemoteDocumentStore implements DocumentStore {
  constructor(private readonly log: Log = console.log) {
    this.log("[remote] connecting to document server...");
  }

  getDocument(id: string, _user: User): Document {
    this.log(`[remote] fetching ${id}`);
    const doc = DOCUMENTS.get(id);
    if (doc === undefined) throw new Error(`document ${id} not found`);
    return doc;
  }
}

/**
 * The Proxy: same interface as the real store, but it controls access to it.
 * Virtual (creates the real store lazily), caching (remembers fetched
 * documents) and protection (viewers may not read confidential documents).
 */
export class DocumentStoreProxy implements DocumentStore {
  private real: RemoteDocumentStore | null = null;
  private readonly cache = new Map<string, Document>();
  private requestCount = 0;
  private fetchCount = 0;

  constructor(private readonly log: Log = console.log) {}

  get requests(): number {
    return this.requestCount;
  }
  get remoteFetches(): number {
    return this.fetchCount;
  }
  get isRealStoreCreated(): boolean {
    return this.real !== null;
  }

  /** Virtual proxy: the expensive real subject is created on first use only. */
  private realStore(): RemoteDocumentStore {
    if (this.real === null) {
      this.log("[proxy] creating the real store on first use");
      this.real = new RemoteDocumentStore(this.log);
    }
    return this.real;
  }

  getDocument(id: string, user: User): Document {
    this.requestCount++;

    // Caching proxy.
    let doc = this.cache.get(id);
    if (doc !== undefined) {
      this.log(`[proxy] cache hit ${id}`);
    } else {
      this.log(`[proxy] cache miss ${id}`);
      doc = this.realStore().getDocument(id, user);
      this.fetchCount++;
      this.cache.set(id, doc);
    }

    // Protection proxy: authorize every request, cached or not.
    if (user.role === "viewer" && doc.classification === "confidential") {
      throw new AccessDeniedError(`${user.role} cannot read confidential ${id}`);
    }
    return doc;
  }
}

/**
 * Bonus: JavaScript has a built-in `Proxy` object that intercepts operations
 * on ANY object. This generic logging proxy wraps every method call of the
 * target without writing a class per interface.
 */
export function withCallLogging<T extends object>(target: T, log: Log = console.log): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value: unknown = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        log(`[js-proxy] ${String(prop)}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
        return value.apply(obj, args);
      };
    },
  });
}
