import { describe, expect, it } from "vitest";
import { Editor, EditorSnapshot, History } from "./editor.ts";

const editorWith = (text: string): Editor => {
  const editor = new Editor();
  editor.type(text);
  return editor;
};

describe("Memento: editor snapshots", () => {
  it("inserts typed text at the cursor and moves it", () => {
    const editor = editorWith("Hello world");
    editor.moveCursor(5);

    editor.type(" cruel");

    expect(editor.content).toBe("Hello cruel world");
    expect(editor.cursor).toBe(11);
    expect(editor.render()).toBe("Hello cruel| world");
  });

  it.each([
    [-3, 0],
    [2, 2],
    [99, 5],
  ])("clamps moveCursor(%i) to %i", (position, expected) => {
    const editor = editorWith("Hello");

    editor.moveCursor(position);

    expect(editor.cursor).toBe(expected);
  });

  it("never backspaces past the start", () => {
    const editor = editorWith("Hello");
    editor.moveCursor(2);

    editor.backspace(10);

    expect(editor.content).toBe("llo");
    expect(editor.cursor).toBe(0);
  });

  it("restores both the text and the cursor", () => {
    const editor = editorWith("Hello world");
    editor.moveCursor(5);
    const snapshot = editor.save();

    editor.type(" cruel");
    editor.moveCursor(0);
    editor.restore(snapshot);

    expect(editor.content).toBe("Hello world");
    expect(editor.cursor).toBe(5);
  });

  it("keeps a snapshot unaffected by later edits so it can be reused", () => {
    const editor = editorWith("Hello");
    const snapshot = editor.save();

    editor.type("!!!");
    editor.restore(snapshot);
    editor.backspace(5);
    editor.restore(snapshot);

    expect(editor.render()).toBe("Hello|");
  });

  it("keeps the snapshot opaque to everyone but the editor", () => {
    const snapshot = editorWith("secret").save();

    expect(snapshot).toBeInstanceOf(EditorSnapshot);
    expect(Object.keys(snapshot)).toEqual([]);
    expect(JSON.stringify(snapshot)).toBe("{}");
  });

  it("undoes backups in reverse order", () => {
    const editor = new Editor();
    const history = new History(editor, () => {});
    editor.type("one");
    history.backup();
    editor.type(" two");
    history.backup();
    editor.type(" three");

    history.undo();
    expect(editor.content).toBe("one two");

    history.undo();
    expect(editor.content).toBe("one");
    expect(history.size).toBe(0);
  });

  it("leaves the editor untouched when there is nothing to undo", () => {
    const log: string[] = [];
    const editor = editorWith("Hello");
    const history = new History(editor, (line) => log.push(line));

    history.undo();

    expect(editor.render()).toBe("Hello|");
    expect(log).toEqual(["[history] nothing to undo"]);
  });

  it("reports the stack size as it changes", () => {
    const log: string[] = [];
    const history = new History(editorWith("Hi"), (line) => log.push(line));

    history.backup();
    history.backup();
    history.undo();

    expect(history.size).toBe(1);
    expect(log).toEqual([
      "[history] backup saved (1 in stack)",
      "[history] backup saved (2 in stack)",
      "[history] restored latest backup (1 left)",
    ]);
  });
});
