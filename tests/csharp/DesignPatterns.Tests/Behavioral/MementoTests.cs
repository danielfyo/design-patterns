using DesignPatterns.Memento;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class MementoTests
{
    private sealed class ForeignSnapshot : IEditorSnapshot;

    private static Editor EditorWith(string text)
    {
        var editor = new Editor();
        editor.Type(text);
        return editor;
    }

    [Fact]
    public void Type_inserts_at_the_cursor_and_moves_it()
    {
        var editor = EditorWith("Hello world");
        editor.MoveCursor(5);

        editor.Type(" cruel");

        Assert.Equal("Hello cruel world", editor.Content);
        Assert.Equal(11, editor.Cursor);
        Assert.Equal("Hello cruel| world", editor.Render());
    }

    [Theory]
    [InlineData(-3, 0)]
    [InlineData(2, 2)]
    [InlineData(99, 5)]
    public void Move_cursor_is_clamped_to_the_text(int position, int expected)
    {
        var editor = EditorWith("Hello");

        editor.MoveCursor(position);

        Assert.Equal(expected, editor.Cursor);
    }

    [Fact]
    public void Backspace_never_deletes_past_the_start()
    {
        var editor = EditorWith("Hello");
        editor.MoveCursor(2);

        editor.Backspace(10);

        Assert.Equal("llo", editor.Content);
        Assert.Equal(0, editor.Cursor);
    }

    [Fact]
    public void Restore_brings_back_both_text_and_cursor()
    {
        var editor = EditorWith("Hello world");
        editor.MoveCursor(5);
        var snapshot = editor.Save();

        editor.Type(" cruel");
        editor.MoveCursor(0);
        editor.Restore(snapshot);

        Assert.Equal("Hello world", editor.Content);
        Assert.Equal(5, editor.Cursor);
    }

    [Fact]
    public void Snapshot_is_unaffected_by_later_edits_and_can_be_reused()
    {
        var editor = EditorWith("Hello");
        var snapshot = editor.Save();

        editor.Type("!!!");
        editor.Restore(snapshot);
        editor.Backspace(5);
        editor.Restore(snapshot);

        Assert.Equal("Hello|", editor.Render());
    }

    [Fact]
    public void Restore_rejects_a_snapshot_the_editor_did_not_create()
    {
        var editor = EditorWith("Hello");

        Assert.Throws<ArgumentException>(() => editor.Restore(new ForeignSnapshot()));
        Assert.Equal("Hello", editor.Content);
    }

    [Fact]
    public void History_undoes_backups_in_reverse_order()
    {
        using var console = new ConsoleCapture();
        var editor = new Editor();
        var history = new History(editor);
        editor.Type("one");
        history.Backup();
        editor.Type(" two");
        history.Backup();
        editor.Type(" three");

        history.Undo();
        Assert.Equal("one two", editor.Content);

        history.Undo();
        Assert.Equal("one", editor.Content);
    }

    [Fact]
    public void Undo_with_an_empty_history_leaves_the_editor_untouched()
    {
        using var console = new ConsoleCapture();
        var editor = EditorWith("Hello");
        var history = new History(editor);

        history.Undo();

        Assert.Equal("Hello|", editor.Render());
        Assert.Equal("[history] nothing to undo\n", console.Output);
    }

    [Fact]
    public void History_reports_the_stack_size()
    {
        using var console = new ConsoleCapture();
        var history = new History(EditorWith("Hi"));

        history.Backup();
        history.Backup();
        history.Undo();

        Assert.Equal(
            "[history] backup saved (1 in stack)\n[history] backup saved (2 in stack)\n"
            + "[history] restored latest backup (1 left)\n",
            console.Output);
    }
}
