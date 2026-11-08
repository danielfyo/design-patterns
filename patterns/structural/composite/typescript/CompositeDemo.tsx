import { useReducer, useRef, useState } from "react";
import { Directory, File, buildSampleProject, type FileSystemNode } from "./fileSystem.ts";

interface TreeNodeProps {
  node: FileSystemNode;
  parent: Directory | null;
  onChange: () => void;
}

/**
 * Recursive component: it renders ANY node. Directories render a TreeNode for each child,
 * mirroring how Directory.size() calls size() on each child. The sizes shown come from the
 * same uniform API for leaves and composites.
 */
function TreeNode({ node, parent, onChange }: TreeNodeProps) {
  const [open, setOpen] = useState(true);
  const counter = useRef(1);

  const removeButton = parent && (
    <button
      onClick={() => {
        parent.remove(node);
        onChange();
      }}
      title="Remove"
    >
      ✕
    </button>
  );

  if (!(node instanceof Directory)) {
    return (
      <li>
        📄 {node.name} <small>({node.size()} bytes)</small> {removeButton}
      </li>
    );
  }

  return (
    <li>
      <button onClick={() => setOpen((o) => !o)} style={{ border: "none", background: "none", cursor: "pointer" }}>
        {open ? "📂" : "📁"} <strong>{node.name}/</strong>
      </button>{" "}
      <small>
        ({node.size()} bytes, {node.countFiles()} files)
      </small>{" "}
      <button
        onClick={() => {
          node.add(new File(`new-${counter.current++}.ts`, 1000));
          onChange();
        }}
      >
        + file
      </button>{" "}
      {removeButton}
      {open && (
        <ul style={{ listStyle: "none", paddingLeft: 20 }}>
          {node.children.map((child) => (
            <TreeNode key={child.name} node={child} parent={node} onChange={onChange} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CompositeDemo() {
  // The tree is a mutable object model; a version counter tells React to re-render after a change.
  const root = useRef<Directory | null>(null);
  root.current ??= buildSampleProject();
  const [, bump] = useReducer((v: number) => v + 1, 0);
  const [extension, setExtension] = useState(".tsx");

  return (
    <section>
      <h2>Composite — File system</h2>
      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        <TreeNode node={root.current} parent={null} onChange={bump} />
      </ul>
      <p>
        Total: <strong>{root.current.size()} bytes</strong> in <strong>{root.current.countFiles()} files</strong>
      </p>
      <label>
        Find by extension <input value={extension} onChange={(e) => setExtension(e.target.value)} size={6} />
      </label>{" "}
      <span>{root.current.findByExtension(extension).join(", ") || "(none)"}</span>
    </section>
  );
}
