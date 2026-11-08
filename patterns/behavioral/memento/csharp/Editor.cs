namespace DesignPatterns.Memento;

/// <summary>
/// The Memento as seen from the outside: an opaque token. It exposes nothing,
/// so the caretaker can store it but never read or change the editor's state.
/// </summary>
public interface IEditorSnapshot;

/// <summary>
/// The Originator: owns the state (text and cursor), creates snapshots of it
/// and restores itself from them.
/// </summary>
public sealed class Editor
{
    public string Content { get; private set; } = "";
    public int Cursor { get; private set; }

    public void Type(string text)
    {
        Content = Content.Insert(Cursor, text);
        Cursor += text.Length;
    }

    public void MoveCursor(int position) => Cursor = Math.Clamp(position, 0, Content.Length);

    public void Backspace(int count)
    {
        count = Math.Min(count, Cursor);
        Content = Content.Remove(Cursor - count, count);
        Cursor -= count;
    }

    /// <summary>The text with a "|" where the cursor is.</summary>
    public string Render() => Content.Insert(Cursor, "|");

    /// <summary>Creates a memento with a copy of the current state.</summary>
    public IEditorSnapshot Save() => new EditorSnapshot(Content, Cursor);

    /// <summary>Restores the state captured in a memento created by an editor.</summary>
    public void Restore(IEditorSnapshot snapshot)
    {
        if (snapshot is not EditorSnapshot s)
            throw new ArgumentException("Not a snapshot created by an Editor.", nameof(snapshot));
        Content = s.Content;
        Cursor = s.Cursor;
    }

    /// <summary>
    /// Concrete Memento: an immutable record, private to <see cref="Editor"/>.
    /// Only the originator can create it and read its fields.
    /// </summary>
    private sealed record EditorSnapshot(string Content, int Cursor) : IEditorSnapshot;
}

/// <summary>
/// The Caretaker: keeps a stack of snapshots and decides <i>when</i> to save
/// and restore, without ever looking inside them.
/// </summary>
public sealed class History(Editor editor)
{
    private readonly Stack<IEditorSnapshot> _snapshots = new();

    public void Backup()
    {
        _snapshots.Push(editor.Save());
        Console.WriteLine($"[history] backup saved ({_snapshots.Count} in stack)");
    }

    public void Undo()
    {
        if (!_snapshots.TryPop(out var snapshot))
        {
            Console.WriteLine("[history] nothing to undo");
            return;
        }
        editor.Restore(snapshot);
        Console.WriteLine($"[history] restored latest backup ({_snapshots.Count} left)");
    }
}
