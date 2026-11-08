using DesignPatterns.Bridge;

Console.WriteLine("=== Bridge Pattern: Reports x renderers ===");

IRenderer[] renderers = [new MarkdownRenderer(), new HtmlRenderer(), new CsvRenderer()];

Report[] reports =
[
    new SalesReport(renderers[0], [("North", 12500.00m), ("South", 8300.50m), ("West", 10199.50m)]),
    new InventoryReport(renderers[0], [("Keyboards", 42), ("Monitors", 7)]),
];

// Every report works with every renderer: the two hierarchies vary independently.
foreach (var report in reports)
{
    foreach (var renderer in renderers)
    {
        report.Renderer = renderer;
        Console.WriteLine($"--- {report.Name} as {renderer.Name} ---");
        foreach (var line in report.Render())
        {
            Console.WriteLine(line);
        }
    }
}

Console.WriteLine(
    $"{reports.Length} reports x {renderers.Length} renderers = {reports.Length * renderers.Length} combinations " +
    $"from {reports.Length + renderers.Length} classes (inheritance alone would need {reports.Length * renderers.Length})");
