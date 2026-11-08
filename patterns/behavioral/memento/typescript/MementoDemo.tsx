import { useReducer, useRef, useState } from "react";
import { Editor, History } from "./editor.ts";

/**
 * React usage: the Editor (originator) and History (caretaker) are mutable
 * objects kept in refs; a counter forces a re-render after each command.
 * The component can show how many snapshots exist, but it has no way to peek
 * inside one: they are opaque.
 */
export default function MementoDemo() {
  const editorRef = useRef<Editor>(null);
  const historyRef = useRef<History>(null);
  const [log, setLog] = useState<string[]>([]);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [text, setText] = useState(" world");

  editorRef.current ??= new Editor();
  historyRef.current ??= new History(editorRef.current, (line) => setLog((l) => [...l.slice(-5), line]));
  const editor = editorRef.current;
  const history = historyRef.current;

  const run = (command: () => void) => () => {
    command();
    rerender();
  };

  return (
    <section>
      <h2>Memento — Editor snapshots</h2>
      <pre style={{ fontSize: 18, background: "#f4f4f4", padding: 8 }}>{editor.render()}</pre>
      <input value={text} onChange={(e) => setText(e.target.value)} />{" "}
      <button onClick={run(() => editor.type(text))}>Type</button>{" "}
      <button onClick={run(() => editor.backspace(1))}>Backspace</button>{" "}
      <button onClick={run(() => editor.moveCursor(editor.cursor - 1))}>◀</button>
      <button onClick={run(() => editor.moveCursor(editor.cursor + 1))}>▶</button>
      <p>
        <button onClick={run(() => history.backup())}>Save snapshot</button>{" "}
        <button onClick={run(() => history.undo())} disabled={history.size === 0}>
          Undo
        </button>{" "}
        <small>{history.size} snapshot(s) in history</small>
      </p>
      <pre style={{ fontSize: 12, margin: 0 }}>{log.join("\n")}</pre>
    </section>
  );
}
