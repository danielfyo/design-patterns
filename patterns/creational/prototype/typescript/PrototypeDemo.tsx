import { useMemo, useState } from "react";
import { defaultRegistry, type Document } from "./documents.ts";

/**
 * React usage: "New document" clones a template from the registry. Each card
 * owns its own deep copy, so editing one never affects the template or the
 * other cards. Tick "shallow copy" to see what happens when the copy shares
 * the template's array/Map/Style: edits leak into the source document.
 */
export default function PrototypeDemo() {
  const registry = useMemo(() => defaultRegistry(), []);
  // A source document per template that the "shallow" mode copies from (and can corrupt).
  const sources = useMemo(
    () => Object.fromEntries(registry.names.map((n) => [n, registry.create(n)])) as Record<string, Document>,
    [registry],
  );
  const [template, setTemplate] = useState(registry.names[0]);
  const [shallow, setShallow] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [, setVersion] = useState(0);
  const rerender = () => setVersion((v) => v + 1);

  const createDoc = () => {
    const doc = shallow ? sources[template].shallowCopy() : sources[template].clone();
    setDocs((previous) => [...previous, doc]);
  };

  const edit = (doc: Document, index: number) => {
    // Mutations are deliberate here: the point is to show whether state is shared.
    doc.title = `${doc.title.split(" #")[0]} #${index + 1}`;
    doc.sections[0] = `Cover for #${index + 1}`;
    doc.metadata.set("status", "edited");
    doc.style.font = "Georgia";
    rerender();
  };

  return (
    <section>
      <h2>Prototype — Document templates</h2>
      <label>
        Template{" "}
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          {registry.names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>{" "}
      <label>
        <input type="checkbox" checked={shallow} onChange={(e) => setShallow(e.target.checked)} /> shallow copy
        (broken)
      </label>{" "}
      <button onClick={createDoc}>New document</button>{" "}
      <button
        onClick={() => {
          setDocs([]);
          for (const n of registry.names) sources[n] = registry.create(n);
        }}
      >
        Reset
      </button>
      <h3 style={{ marginBottom: 4 }}>Source document for “{template}”</h3>
      <pre style={{ background: "#f5f5f5", padding: "0.5rem", whiteSpace: "pre-wrap" }}>{sources[template].toString()}</pre>
      <h3 style={{ marginBottom: 4 }}>Your documents</h3>
      {docs.length === 0 && <p>None yet.</p>}
      {docs.map((doc, i) => (
        <div key={i} style={{ border: "1px solid #ddd", padding: "0.5rem", marginBottom: "0.5rem" }}>
          <code style={{ whiteSpace: "pre-wrap" }}>{doc.toString()}</code>{" "}
          <button onClick={() => edit(doc, i)}>Edit</button>
        </div>
      ))}
    </section>
  );
}
