// Run with: npx tsx patterns/structural/proxy/typescript/main.ts
import { AccessDeniedError, DocumentStoreProxy, type DocumentStore, type User } from "./documents.ts";

console.log("=== Proxy Pattern: Document store proxy ===");

const proxy = new DocumentStoreProxy();
const store: DocumentStore = proxy; // the client only sees the Subject interface
console.log(`Proxy ready, real store created: ${proxy.isRealStoreCreated}`);

const alice: User = { name: "alice", role: "editor" };
const bob: User = { name: "bob", role: "viewer" };

function request(user: User, id: string): void {
  console.log(`${user.name} (${user.role}) asks for ${id}`);
  try {
    const doc = store.getDocument(id, user);
    console.log(`  -> "${doc.title}" (${doc.classification})`);
  } catch (err) {
    if (!(err instanceof AccessDeniedError)) throw err;
    console.log(`  -> access denied: ${err.message}`);
  }
}

request(alice, "doc-1");
request(bob, "doc-1");
request(bob, "doc-2");
request(alice, "doc-2");

console.log(
  `Stats: ${proxy.requests} requests, ${proxy.remoteFetches} remote fetches, real store created: ${proxy.isRealStoreCreated}`,
);
