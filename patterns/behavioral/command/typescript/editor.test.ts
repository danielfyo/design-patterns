import { beforeEach, describe, expect, it } from "vitest";
import {
  CommandHistory,
  DeleteTextCommand,
  InsertTextCommand,
  MacroCommand,
  ReplaceAllCommand,
  TextDocument,
} from "./editor.ts";

describe("Command: text editor with undo/redo", () => {
  let document: TextDocument;
  let history: CommandHistory;

  beforeEach(() => {
    document = new TextDocument();
    history = new CommandHistory();
  });

  it("restores the previous content when an insert is undone", () => {
    history.execute(new InsertTextCommand(document, 0, "Hello"));
    history.execute(new InsertTextCommand(document, 5, " world"));
    expect(document.content).toBe("Hello world");

    history.undo();

    expect(document.content).toBe("Hello");
  });

  it("remembers deleted text so undo can bring it back", () => {
    document.replace("Hello, world");

    history.execute(new DeleteTextCommand(document, 5, 7));
    expect(document.content).toBe("Hello");
    history.undo();

    expect(document.content).toBe("Hello, world");
  });

  it("re-executes the last undone command on redo", () => {
    const command = new InsertTextCommand(document, 0, "Hi");
    history.execute(command);
    history.undo();

    expect(history.redo()).toBe(command);
    expect(document.content).toBe("Hi");
    expect([history.undoCount, history.redoCount]).toEqual([1, 0]);
  });

  it("clears the redo stack when a new command is executed", () => {
    history.execute(new InsertTextCommand(document, 0, "Hello"));
    history.execute(new InsertTextCommand(document, 5, "!"));
    history.undo();
    expect(history.redoCount).toBe(1);

    history.execute(new InsertTextCommand(document, 5, "?"));

    expect(history.redoCount).toBe(0);
    expect(history.redo()).toBeNull();
    expect(document.content).toBe("Hello?");
  });

  it("returns null and changes nothing when undoing or redoing an empty history", () => {
    document.replace("text");

    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
    expect(document.content).toBe("text");
  });

  it("restores the snapshot when a replace-all is undone", () => {
    document.replace("world, world");

    history.execute(new ReplaceAllCommand(document, "world", "WORLD"));
    expect(document.content).toBe("WORLD, WORLD");
    history.undo();

    expect(document.content).toBe("world, world");
  });

  it("runs a macro's steps in order and undoes them as a single step", () => {
    document.replace("Hello, world");
    const macro = new MacroCommand("Shout", [
      new ReplaceAllCommand(document, "world", "WORLD"),
      new InsertTextCommand(document, 12, "!"),
    ]);

    history.execute(macro);
    expect(document.content).toBe("Hello, WORLD!");
    expect(history.undoCount).toBe(1);
    history.undo();

    expect(document.content).toBe("Hello, world");
    expect(history.undoCount).toBe(0);
  });

  it("gives every command a human-readable description", () => {
    expect(new InsertTextCommand(document, 3, "Hi").description).toBe('Insert "Hi" at 3');
    expect(new DeleteTextCommand(document, 5, 7).description).toBe("Delete 7 chars at 5");
    expect(new ReplaceAllCommand(document, "a", "b").description).toBe('Replace "a" with "b"');
    expect(new MacroCommand("M", []).description).toBe('Macro "M" (0 steps)');
  });
});
