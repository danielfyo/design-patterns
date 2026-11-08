namespace DesignPatterns.Prototype;

/// <summary>
/// Nested, mutable part of a document. Because it is a reference type, a shallow
/// copy of a <see cref="Document"/> would share it with the original.
/// It is a record so that <c>style with { }</c> gives us a copy for free.
/// </summary>
public sealed record Style(string Font, int SizePt)
{
    public string Font { get; set; } = Font;
    public int SizePt { get; set; } = SizePt;
}

/// <summary>
/// Prototype: a document that knows how to copy itself. <see cref="Clone"/> performs a
/// DEEP copy, so the clone and the original never share mutable state.
/// </summary>
public sealed class Document(string title, List<string> sections, Dictionary<string, string> metadata, Style style)
{
    public string Title { get; set; } = title;
    public List<string> Sections { get; } = sections;
    public Dictionary<string, string> Metadata { get; } = metadata;
    public Style Style { get; } = style;

    /// <summary>Deep copy: new list, new dictionary, new style. Strings are immutable, so they can be shared.</summary>
    public Document Clone() =>
        new(Title, [.. Sections], new Dictionary<string, string>(Metadata), Style with { });

    /// <summary>
    /// Shallow copy, for comparison only: <see cref="object.MemberwiseClone"/> copies the
    /// field values, i.e. the <em>references</em> to the list, dictionary and style.
    /// </summary>
    public Document ShallowCopy() => (Document)MemberwiseClone();

    public override string ToString()
    {
        var meta = string.Join(", ", Metadata.OrderBy(kv => kv.Key, StringComparer.Ordinal).Select(kv => $"{kv.Key}={kv.Value}"));
        return $"{Title} | {Style.Font} {Style.SizePt}pt | sections=[{string.Join(", ", Sections)}] | metadata={{{meta}}}";
    }
}

/// <summary>
/// Prototype registry (Client side helper): stores named, pre-configured prototypes
/// and hands out clones, so callers never construct documents from scratch.
/// </summary>
public sealed class TemplateRegistry
{
    private readonly Dictionary<string, Document> _prototypes = [];

    public IEnumerable<string> Names => _prototypes.Keys.Order(StringComparer.Ordinal);

    /// <summary>Stores a private clone, so later changes to the caller's object do not affect the template.</summary>
    public void Register(string name, Document prototype) => _prototypes[name] = prototype.Clone();

    public Document Create(string name) =>
        _prototypes.TryGetValue(name, out var prototype)
            ? prototype.Clone()
            : throw new KeyNotFoundException($"no template named \"{name}\"");
}
