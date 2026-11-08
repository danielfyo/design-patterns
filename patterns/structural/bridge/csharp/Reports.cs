namespace DesignPatterns.Bridge;

/// <summary>
/// Abstraction: a report knows WHAT to show (title, rows, footer) and delegates
/// HOW to draw it to the <see cref="IRenderer"/> it holds — that reference is the bridge.
/// </summary>
public abstract class Report(IRenderer renderer)
{
    /// <summary>The implementor can be swapped at runtime, independently of the report type.</summary>
    public IRenderer Renderer { get; set; } = renderer;

    public abstract string Name { get; }
    protected abstract string Title { get; }
    protected abstract IEnumerable<(string Label, string Value)> Rows();
    protected abstract (string Label, string Value) Footer();

    /// <summary>High-level operation built only from the implementor's primitives.</summary>
    public IReadOnlyList<string> Render()
    {
        var lines = new List<string> { Renderer.RenderTitle(Title) };
        lines.AddRange(Rows().Select(row => Renderer.RenderRow(row.Label, row.Value)));
        var (label, value) = Footer();
        lines.Add(Renderer.RenderFooter(label, value));
        return lines;
    }
}

/// <summary>Refined Abstraction: revenue per region with a grand total.</summary>
public sealed class SalesReport(IRenderer renderer, IReadOnlyList<(string Region, decimal Amount)> sales)
    : Report(renderer)
{
    public override string Name => "Sales report";
    protected override string Title => "Sales by region";

    protected override IEnumerable<(string Label, string Value)> Rows() =>
        sales.Select(s => (s.Region, s.Amount.ToString("0.00")));

    protected override (string Label, string Value) Footer() =>
        ("Total", sales.Sum(s => s.Amount).ToString("0.00"));
}

/// <summary>Refined Abstraction: stock levels per product.</summary>
public sealed class InventoryReport(IRenderer renderer, IReadOnlyList<(string Product, int Units)> stock)
    : Report(renderer)
{
    public override string Name => "Inventory report";
    protected override string Title => "Inventory status";

    protected override IEnumerable<(string Label, string Value)> Rows() =>
        stock.Select(s => (s.Product, $"{s.Units} units"));

    protected override (string Label, string Value) Footer() =>
        ("Total units", stock.Sum(s => s.Units).ToString());
}
