// Run with: npx tsx patterns/behavioral/memento/typescript/main.ts
import { Editor, History } from "./editor.ts";

console.log("=== Memento Pattern: Editor snapshots ===");

const editor = new Editor();
const history = new History(editor);

const show = (action: string): void =>
  console.log(`${action.padEnd(20)} "${editor.render()}" (cursor ${editor.cursor})`);

const type = (text: string): void => {
  editor.type(text);
  show(`type "${text}"`);
};

const undo = (): void => {
  history.undo();
  show("undo");
};

type("Hello");
history.backup();
type(" world");
history.backup();

editor.moveCursor(5);
show("move cursor to 5");
type(" cruel");
undo(); // back to "Hello world|", cursor included

type("!");
history.backup();
editor.backspace(7);
show("backspace 7");

undo();
undo();
undo(); // the stack is empty: nothing happens
