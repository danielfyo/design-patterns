namespace DesignPatterns.Tests;

/// <summary>
/// Captures everything written to <see cref="Console.Out"/> while it is alive, so tests can assert
/// on the trace that the examples print. xUnit runs test classes in parallel, so every class that
/// uses it belongs to the "Console" collection, which runs sequentially.
/// </summary>
public sealed class ConsoleCapture : IDisposable
{
    private readonly TextWriter _original = Console.Out;
    private readonly StringWriter _writer = new();

    public ConsoleCapture() => Console.SetOut(_writer);

    public string Output => _writer.ToString().ReplaceLineEndings("\n");

    public void Dispose()
    {
        Console.SetOut(_original);
        _writer.Dispose();
    }
}

[CollectionDefinition("Console", DisableParallelization = true)]
public sealed class ConsoleTestGroup;
