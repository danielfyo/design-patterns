using DesignPatterns.Bridge;

namespace DesignPatterns.Tests.Structural;

public sealed class BridgeTests
{
    private static readonly (string Region, decimal Amount)[] Sales =
        [("North", 12500.00m), ("South", 8300.50m), ("West", 10199.50m)];

    private static readonly (string Product, int Units)[] Stock = [("Keyboards", 42), ("Monitors", 7)];

    /// <summary>A new Concrete Implementor written without touching any report.</summary>
    private sealed class PlainTextRenderer : IRenderer
    {
        public string Name => "Plain text";
        public string RenderTitle(string title) => title.ToUpperInvariant();
        public string RenderRow(string label, string value) => $"{label} = {value}";
        public string RenderFooter(string label, string value) => $"== {label} = {value}";
    }

    /// <summary>A new Refined Abstraction written without touching any renderer.</summary>
    private sealed class HeadcountReport(IRenderer renderer) : Report(renderer)
    {
        public override string Name => "Headcount report";
        protected override string Title => "Headcount";
        protected override IEnumerable<(string Label, string Value)> Rows() => [("Engineering", "12"), ("Sales", "5")];
        protected override (string Label, string Value) Footer() => ("Total", "17");
    }

    [Fact]
    public void Sales_report_renders_rows_and_grand_total_through_markdown()
    {
        var report = new SalesReport(new MarkdownRenderer(), Sales);

        Assert.Equal(
            ["# Sales by region", "- **North**: 12500.00", "- **South**: 8300.50", "- **West**: 10199.50", "**Total: 31000.00**"],
            report.Render());
    }

    [Fact]
    public void Inventory_report_renders_units_and_total_through_html()
    {
        var report = new InventoryReport(new HtmlRenderer(), Stock);

        Assert.Equal(
            [
                "<h1>Inventory status</h1>",
                "<p><strong>Keyboards:</strong> 42 units</p>",
                "<p><strong>Monitors:</strong> 7 units</p>",
                "<footer>Total units: 49</footer>",
            ],
            report.Render());
    }

    [Fact]
    public void Swapping_the_renderer_at_runtime_changes_only_the_format()
    {
        var report = new InventoryReport(new MarkdownRenderer(), Stock);
        var markdown = report.Render();

        report.Renderer = new CsvRenderer();

        Assert.Equal(["report,Inventory status", "Keyboards,42 units", "Monitors,7 units", "Total units,49"], report.Render());
        Assert.Equal(markdown.Count, report.Render().Count);
    }

    [Theory]
    [InlineData("Markdown", "# Sales by region")]
    [InlineData("HTML", "<h1>Sales by region</h1>")]
    [InlineData("CSV", "report,Sales by region")]
    public void Every_renderer_works_with_the_same_report(string rendererName, string expectedTitle)
    {
        IRenderer[] renderers = [new MarkdownRenderer(), new HtmlRenderer(), new CsvRenderer()];
        var renderer = renderers.Single(r => r.Name == rendererName);

        var lines = new SalesReport(renderer, Sales).Render();

        Assert.Equal(expectedTitle, lines[0]);
        Assert.Equal(5, lines.Count);
    }

    [Fact]
    public void A_new_renderer_works_with_existing_reports_unchanged()
    {
        var renderer = new PlainTextRenderer();

        Assert.Equal(
            ["SALES BY REGION", "North = 12500.00", "South = 8300.50", "West = 10199.50", "== Total = 31000.00"],
            new SalesReport(renderer, Sales).Render());
        Assert.Equal("== Total units = 49", new InventoryReport(renderer, Stock).Render()[^1]);
    }

    [Fact]
    public void A_new_report_works_with_existing_renderers_unchanged()
    {
        var report = new HeadcountReport(new CsvRenderer());

        Assert.Equal(["report,Headcount", "Engineering,12", "Sales,5", "Total,17"], report.Render());
    }

    [Fact]
    public void Empty_reports_still_render_a_title_and_a_zero_total()
    {
        Assert.Equal(["report,Sales by region", "Total,0.00"], new SalesReport(new CsvRenderer(), []).Render());
        Assert.Equal(["report,Inventory status", "Total units,0"], new InventoryReport(new CsvRenderer(), []).Render());
    }
}
