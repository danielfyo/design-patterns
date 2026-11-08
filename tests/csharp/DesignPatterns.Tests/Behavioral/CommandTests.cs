using DesignPatterns.Command;

namespace DesignPatterns.Tests.Behavioral;

public sealed class CommandTests
{
    private readonly TextDocument _document = new();
    private readonly CommandHistory _history = new();

    [Fact]
    public void Insert_and_undo_restore_the_previous_content()
    {
        _history.Execute(new InsertTextCommand(_document, 0, "Hello"));
        _history.Execute(new InsertTextCommand(_document, 5, " world"));
        Assert.Equal("Hello world", _document.Content);

        _history.Undo();

        Assert.Equal("Hello", _document.Content);
    }

    [Fact]
    public void Delete_remembers_the_removed_text_so_undo_can_bring_it_back()
    {
        _document.Replace("Hello, world");

        _history.Execute(new DeleteTextCommand(_document, 5, 7));
        Assert.Equal("Hello", _document.Content);
        _history.Undo();

        Assert.Equal("Hello, world", _document.Content);
    }

    [Fact]
    public void Redo_re_executes_the_last_undone_command()
    {
        var command = new InsertTextCommand(_document, 0, "Hi");
        _history.Execute(command);
        _history.Undo();

        var redone = _history.Redo();

        Assert.Same(command, redone);
        Assert.Equal("Hi", _document.Content);
        Assert.Equal(1, _history.UndoCount);
        Assert.Equal(0, _history.RedoCount);
    }

    [Fact]
    public void Executing_a_new_command_clears_the_redo_stack()
    {
        _history.Execute(new InsertTextCommand(_document, 0, "Hello"));
        _history.Execute(new InsertTextCommand(_document, 5, "!"));
        _history.Undo();
        Assert.Equal(1, _history.RedoCount);

        _history.Execute(new InsertTextCommand(_document, 5, "?"));

        Assert.Equal(0, _history.RedoCount);
        Assert.Null(_history.Redo());
        Assert.Equal("Hello?", _document.Content);
    }

    [Fact]
    public void Undo_and_redo_on_an_empty_history_return_null_and_change_nothing()
    {
        _document.Replace("text");

        Assert.Null(_history.Undo());
        Assert.Null(_history.Redo());
        Assert.Equal("text", _document.Content);
    }

    [Fact]
    public void Replace_all_undo_restores_the_snapshot()
    {
        _document.Replace("world, world");

        _history.Execute(new ReplaceAllCommand(_document, "world", "WORLD"));
        Assert.Equal("WORLD, WORLD", _document.Content);
        _history.Undo();

        Assert.Equal("world, world", _document.Content);
    }

    [Fact]
    public void Macro_runs_its_steps_in_order_and_undoes_them_as_one_step()
    {
        _document.Replace("Hello, world");
        var macro = new MacroCommand("Shout",
        [
            new ReplaceAllCommand(_document, "world", "WORLD"),
            new InsertTextCommand(_document, 12, "!"),
        ]);

        _history.Execute(macro);
        Assert.Equal("Hello, WORLD!", _document.Content);
        Assert.Equal(1, _history.UndoCount);
        _history.Undo();

        Assert.Equal("Hello, world", _document.Content);
        Assert.Equal(0, _history.UndoCount);
    }

    [Fact]
    public void Commands_describe_themselves()
    {
        Assert.Equal("Insert \"Hi\" at 3", new InsertTextCommand(_document, 3, "Hi").Description);
        Assert.Equal("Delete 7 chars at 5", new DeleteTextCommand(_document, 5, 7).Description);
        Assert.Equal("Replace \"a\" with \"b\"", new ReplaceAllCommand(_document, "a", "b").Description);
        Assert.Equal("Macro \"M\" (0 steps)", new MacroCommand("M", []).Description);
    }
}
