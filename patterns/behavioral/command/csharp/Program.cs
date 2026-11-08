using DesignPatterns.Command;

Console.WriteLine("=== Command Pattern: Text editor with undo/redo ===");

var document = new TextDocument();
var history = new CommandHistory();

void Show(string action, string description) =>
    Console.WriteLine($"{action,-8}{description,-30} -> \"{document.Content}\"");

void Execute(ICommand command)
{
    history.Execute(command);
    Show("execute", command.Description);
}

void Undo() => Show("undo", history.Undo()?.Description ?? "(nothing to undo)");
void Redo() => Show("redo", history.Redo()?.Description ?? "(nothing to redo)");

Execute(new InsertTextCommand(document, 0, "Hello"));
Execute(new InsertTextCommand(document, 5, " world"));
Execute(new InsertTextCommand(document, 5, ","));
Undo();
Redo();
Execute(new DeleteTextCommand(document, 5, 7));
Undo();
// A new command after an undo clears the redo stack.
Execute(new InsertTextCommand(document, 6, " big"));
Redo();
// A macro groups several commands into a single undoable step.
Execute(new MacroCommand("Shout",
[
    new ReplaceAllCommand(document, "world", "WORLD"),
    new InsertTextCommand(document, 16, "!"),
]));
Undo();
Undo();
Console.WriteLine($"History: undo={history.UndoCount}, redo={history.RedoCount}");
