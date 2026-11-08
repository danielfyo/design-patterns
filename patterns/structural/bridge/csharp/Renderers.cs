namespace DesignPatterns.Bridge;

/// <summary>
/// Implementor: the low-level operations every output format must provide.
/// Reports are written only in terms of these primitives.
/// </summary>
public interface IRenderer
{
    string Name { get; }
    string RenderTitle(string title);
    string RenderRow(string label, string value);
    string RenderFooter(string label, string value);
}

/// <summary>Concrete Implementor: Markdown output.</summary>
public sealed class MarkdownRenderer : IRenderer
{
    public string Name => "Markdown";
    public string RenderTitle(string title) => $"# {title}";
    public string RenderRow(string label, string value) => $"- **{label}**: {value}";
    public string RenderFooter(string label, string value) => $"**{label}: {value}**";
}

/// <summary>Concrete Implementor: HTML output.</summary>
public sealed class HtmlRenderer : IRenderer
{
    public string Name => "HTML";
    public string RenderTitle(string title) => $"<h1>{title}</h1>";
    public string RenderRow(string label, string value) => $"<p><strong>{label}:</strong> {value}</p>";
    public string RenderFooter(string label, string value) => $"<footer>{label}: {value}</footer>";
}

/// <summary>Concrete Implementor: CSV output (one label,value pair per line).</summary>
public sealed class CsvRenderer : IRenderer
{
    public string Name => "CSV";
    public string RenderTitle(string title) => $"report,{title}";
    public string RenderRow(string label, string value) => $"{label},{value}";
    public string RenderFooter(string label, string value) => $"{label},{value}";
}
