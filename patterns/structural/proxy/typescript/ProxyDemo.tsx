import { useMemo, useState } from "react";
import { AccessDeniedError, DocumentStoreProxy, withCallLogging, type DocumentStore, type User } from "./documents.ts";

const USERS: User[] = [
  { name: "alice", role: "editor" },
  { name: "bob", role: "viewer" },
];
const DOC_IDS = ["doc-1", "doc-2"];

/**
 * React usage: the component holds ONE proxy for its lifetime (useMemo) and
 * talks to it through the DocumentStore interface. Watch the trace: the remote
 * store is created on the first click only, repeated reads come from the
 * cache, and bob is refused confidential documents. The proxy is additionally
 * wrapped in a built-in JavaScript `Proxy` that logs every method call.
 */
export default function ProxyDemo() {
  const [userIndex, setUserIndex] = useState(0);
  const [docId, setDocId] = useState(DOC_IDS[0]);
  const [trace, setTrace] = useState<string[]>([]);

  const { proxy, store, lines } = useMemo(() => {
    const lines: string[] = [];
    const log = (line: string) => lines.push(line);
    const proxy = new DocumentStoreProxy(log);
    const store: DocumentStore = withCallLogging<DocumentStore>(proxy, log);
    return { proxy, store, lines };
  }, []);

  const open = () => {
    const user = USERS[userIndex];
    lines.push(`${user.name} (${user.role}) asks for ${docId}`);
    try {
      const doc = store.getDocument(docId, user);
      lines.push(`  -> "${doc.title}" (${doc.classification})`);
    } catch (err) {
      lines.push(`  -> ${err instanceof AccessDeniedError ? `access denied: ${err.message}` : String(err)}`);
    }
    setTrace([...lines]);
  };

  return (
    <section>
      <h2>Proxy — Document store proxy</h2>
      <label>
        User{" "}
        <select value={userIndex} onChange={(e) => setUserIndex(Number(e.target.value))}>
          {USERS.map((u, i) => (
            <option key={u.name} value={i}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        Document{" "}
        <select value={docId} onChange={(e) => setDocId(e.target.value)}>
          {DOC_IDS.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>{" "}
      <button onClick={open}>Open</button>
      <p>
        Real store created: <strong>{String(proxy.isRealStoreCreated)}</strong> · requests: {proxy.requests} · remote
        fetches: {proxy.remoteFetches}
      </p>
      <pre>{trace.join("\n")}</pre>
    </section>
  );
}
