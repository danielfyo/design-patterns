using DesignPatterns.Memento;

Console.WriteLine("=== Memento Pattern: Editor snapshots ===");

var editor = new Editor();
var history = new History(editor);

void Show(string action) =>
    Console.WriteLine($"{action,-20} \"{editor.Render()}\" (cursor {editor.Cursor})");

void Type(string text)
{
    editor.Type(text);
    Show($"type \"{text}\"");
}

void Undo()
{
    history.Undo();
    Show("undo");
}

Type("Hello");
history.Backup();
Type(" world");
history.Backup();

editor.MoveCursor(5);
Show("move cursor to 5");
Type(" cruel");
Undo();                 // back to "Hello world|", cursor included

Type("!");
history.Backup();
editor.Backspace(7);
Show("backspace 7");

Undo();
Undo();
Undo();                 // the stack is empty: nothing happens
