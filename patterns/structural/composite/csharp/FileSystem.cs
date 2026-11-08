namespace DesignPatterns.Composite;

/// <summary>
/// Component: the common interface for files and directories. Clients call these
/// operations without knowing whether they talk to a single file or a whole tree.
/// </summary>
public abstract class FileSystemNode(string name)
{
    public string Name { get; } = name;

    public abstract long Size();
    public abstract int CountFiles();
    public abstract IEnumerable<string> FindByExtension(string extension);
    public abstract void Print(int indent = 0);

    protected static string Pad(int indent) => new(' ', indent * 2);
}

/// <summary>Leaf: a file has a size of its own and no children.</summary>
public sealed class File(string name, long sizeInBytes) : FileSystemNode(name)
{
    public override long Size() => sizeInBytes;
    public override int CountFiles() => 1;

    public override IEnumerable<string> FindByExtension(string extension)
    {
        if (Name.EndsWith(extension, StringComparison.Ordinal))
        {
            yield return Name;
        }
    }

    public override void Print(int indent = 0) =>
        Console.WriteLine($"{Pad(indent)}{Name} ({Size()} bytes)");
}

/// <summary>
/// Composite: a directory stores child nodes (files or other directories) and implements
/// every operation by delegating to its children and combining the results.
/// </summary>
public sealed class Directory(string name) : FileSystemNode(name)
{
    private readonly List<FileSystemNode> _children = [];

    public IReadOnlyList<FileSystemNode> Children => _children;

    /// <summary>Returns <c>this</c> so trees can be built fluently.</summary>
    public Directory Add(params FileSystemNode[] nodes)
    {
        _children.AddRange(nodes);
        return this;
    }

    public bool Remove(FileSystemNode node) => _children.Remove(node);

    public override long Size() => _children.Sum(child => child.Size());
    public override int CountFiles() => _children.Sum(child => child.CountFiles());

    public override IEnumerable<string> FindByExtension(string extension) =>
        _children.SelectMany(child => child.FindByExtension(extension));

    public override void Print(int indent = 0)
    {
        Console.WriteLine($"{Pad(indent)}{Name}/ ({Size()} bytes)");
        foreach (var child in _children)
        {
            child.Print(indent + 1);
        }
    }
}
