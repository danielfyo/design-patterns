// Run with: npx tsx patterns/behavioral/command/typescript/main.ts
import {
  CommandHistory,
  DeleteTextCommand,
  InsertTextCommand,
  MacroCommand,
  ReplaceAllCommand,
  TextDocument,
  type Command,
} from "./editor.ts";

console.log("=== Command Pattern: Text editor with undo/redo ===");

const document = new TextDocument();
const history = new CommandHistory();

const show = (action: string, description: string): void =>
  console.log(`${action.padEnd(8)}${description.padEnd(30)} -> "${document.content}"`);

const execute = (command: Command): void => {
  history.execute(command);
  show("execute", command.description);
};
const undo = (): void => show("undo", history.undo()?.description ?? "(nothing to undo)");
const redo = (): void => show("redo", history.redo()?.description ?? "(nothing to redo)");

execute(new InsertTextCommand(document, 0, "Hello"));
execute(new InsertTextCommand(document, 5, " world"));
execute(new InsertTextCommand(document, 5, ","));
undo();
redo();
execute(new DeleteTextCommand(document, 5, 7));
undo();
// A new command after an undo clears the redo stack.
execute(new InsertTextCommand(document, 6, " big"));
redo();
// A macro groups several commands into a single undoable step.
execute(
  new MacroCommand("Shout", [
    new ReplaceAllCommand(document, "world", "WORLD"),
    new InsertTextCommand(document, 16, "!"),
  ]),
);
undo();
undo();
console.log(`History: undo=${history.undoCount}, redo=${history.redoCount}`);
