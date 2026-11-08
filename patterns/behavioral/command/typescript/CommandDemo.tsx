import { useReducer, useRef, useState } from "react";
import {
  CommandHistory,
  DeleteTextCommand,
  InsertTextCommand,
  MacroCommand,
  ReplaceAllCommand,
  TextDocument,
  type Command,
} from "./editor.ts";

/**
 * React usage: the receiver (TextDocument) and the invoker (CommandHistory)
 * live in a ref; buttons create command objects and hand them to the invoker.
 * Because they mutate objects outside React state, we bump a counter to re-render.
 *
 * Note: `useReducer` (and Redux) is the same idea in functional form — an action
 * like `{ type: "insert", position, text }` is a serializable command, and the
 * reducer is the code that executes it.
 */
export default function CommandDemo() {
  const editor = useRef<{ document: TextDocument; history: CommandHistory } | null>(null);
  editor.current ??= { document: new TextDocument(), history: new CommandHistory() };
  const { document, history } = editor.current;

  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [position, setPosition] = useState(0);
  const [text, setText] = useState("Hello");
  const [length, setLength] = useState(1);
  const [log, setLog] = useState<string[]>([]);

  const record = (line: string) => {
    const entry = `${line} -> "${document.content}"`;
    setLog((prev) => [entry, ...prev].slice(0, 12));
    rerender();
  };

  const run = (command: Command) => {
    history.execute(command);
    record(`execute ${command.description}`);
  };

  const clampedPosition = Math.min(Math.max(position, 0), document.content.length);

  return (
    <section>
      <h2>Command — Text editor with undo/redo</h2>
      <pre style={{ background: "#f4f4f4", padding: 8, minHeight: "1.5em" }}>{document.content || " "}</pre>
      <label>
        Position{" "}
        <input type="number" value={position} min={0} onChange={(e) => setPosition(Number(e.target.value))} />
      </label>{" "}
      <label>
        Text <input value={text} onChange={(e) => setText(e.target.value)} />
      </label>{" "}
      <label>
        Length{" "}
        <input type="number" value={length} min={1} onChange={(e) => setLength(Number(e.target.value))} />
      </label>
      <p>
        <button onClick={() => run(new InsertTextCommand(document, clampedPosition, text))}>Insert</button>{" "}
        <button
          disabled={clampedPosition >= document.content.length}
          onClick={() =>
            run(
              new DeleteTextCommand(document, clampedPosition, Math.min(length, document.content.length - clampedPosition)),
            )
          }
        >
          Delete
        </button>{" "}
        <button
          onClick={() =>
            run(
              new MacroCommand("Shout", [
                new ReplaceAllCommand(document, "world", "WORLD"),
                new InsertTextCommand(document, document.content.replaceAll("world", "WORLD").length, "!"),
              ]),
            )
          }
        >
          Macro: Shout
        </button>{" "}
        <button disabled={history.undoCount === 0} onClick={() => record(`undo ${history.undo()?.description}`)}>
          Undo ({history.undoCount})
        </button>{" "}
        <button disabled={history.redoCount === 0} onClick={() => record(`redo ${history.redo()?.description}`)}>
          Redo ({history.redoCount})
        </button>
      </p>
      <ol reversed style={{ fontFamily: "monospace" }}>
        {log.map((line, i) => (
          <li key={log.length - i}>{line}</li>
        ))}
      </ol>
    </section>
  );
}
