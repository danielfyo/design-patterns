namespace DesignPatterns.Command;

/// <summary>
/// Receiver: the object that knows how to do the real work. It has no idea
/// that commands, undo or redo exist.
/// </summary>
public sealed class TextDocument
{
    public string Content { get; private set; } = "";

    public void Insert(int position, string text) => Content = Content.Insert(position, text);

    /// <summary>Removes <paramref name="length"/> characters and returns them.</summary>
    public string Delete(int position, int length)
    {
        var removed = Content.Substring(position, length);
        Content = Content.Remove(position, length);
        return removed;
    }

    public void Replace(string content) => Content = content;
}

/// <summary>
/// Command: every editor operation is an object with the same interface,
/// so the invoker can execute, store, undo and redo it without knowing what it does.
/// </summary>
public interface ICommand
{
    string Description { get; }
    void Execute();
    void Undo();
}

/// <summary>Concrete Command: inserts text; undo removes the same characters.</summary>
public sealed class InsertTextCommand(TextDocument document, int position, string text) : ICommand
{
    public string Description => $"Insert \"{text}\" at {position}";
    public void Execute() => document.Insert(position, text);
    public void Undo() => document.Delete(position, text.Length);
}

/// <summary>
/// Concrete Command: deletes text. It remembers what it deleted, because the
/// receiver cannot bring it back on its own.
/// </summary>
public sealed class DeleteTextCommand(TextDocument document, int position, int length) : ICommand
{
    private string _deleted = "";

    public string Description => $"Delete {length} chars at {position}";
    public void Execute() => _deleted = document.Delete(position, length);
    public void Undo() => document.Insert(position, _deleted);
}

/// <summary>
/// Concrete Command: replaces every occurrence of a word. Undo restores a
/// snapshot of the previous content (simpler than inverting each replacement).
/// </summary>
public sealed class ReplaceAllCommand(TextDocument document, string find, string replacement) : ICommand
{
    private string _before = "";

    public string Description => $"Replace \"{find}\" with \"{replacement}\"";

    public void Execute()
    {
        _before = document.Content;
        document.Replace(_before.Replace(find, replacement));
    }

    public void Undo() => document.Replace(_before);
}

/// <summary>
/// Macro Command (a Composite of commands): executes its children in order and
/// undoes them in reverse order, so the whole macro is a single undo step.
/// </summary>
public sealed class MacroCommand(string name, IReadOnlyList<ICommand> commands) : ICommand
{
    public string Description => $"Macro \"{name}\" ({commands.Count} steps)";

    public void Execute()
    {
        foreach (var command in commands) command.Execute();
    }

    public void Undo()
    {
        for (var i = commands.Count - 1; i >= 0; i--) commands[i].Undo();
    }
}

/// <summary>
/// Invoker: executes commands and keeps the undo/redo history. Executing a new
/// command clears the redo stack (the "future" is no longer valid).
/// </summary>
public sealed class CommandHistory
{
    private readonly Stack<ICommand> _undo = new();
    private readonly Stack<ICommand> _redo = new();

    public int UndoCount => _undo.Count;
    public int RedoCount => _redo.Count;

    public void Execute(ICommand command)
    {
        command.Execute();
        _undo.Push(command);
        _redo.Clear();
    }

    /// <summary>Undoes the last command and returns it, or null if there is nothing to undo.</summary>
    public ICommand? Undo()
    {
        if (!_undo.TryPop(out var command)) return null;
        command.Undo();
        _redo.Push(command);
        return command;
    }

    /// <summary>Re-executes the last undone command and returns it, or null if there is nothing to redo.</summary>
    public ICommand? Redo()
    {
        if (!_redo.TryPop(out var command)) return null;
        command.Execute();
        _undo.Push(command);
        return command;
    }
}
