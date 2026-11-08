using DesignPatterns.Prototype;

Console.WriteLine("=== Prototype Pattern: Document templates ===");

static string Bool(bool value) => value ? "true" : "false";

var registry = new TemplateRegistry();
registry.Register("invoice", new Document(
    "Invoice",
    ["Header", "Line items", "Totals"],
    new() { ["owner"] = "billing", ["status"] = "template" },
    new Style("Helvetica", 10)));
registry.Register("report", new Document(
    "Quarterly Report",
    ["Summary", "Findings", "Next steps"],
    new() { ["owner"] = "analytics", ["status"] = "template" },
    new Style("Times", 12)));
Console.WriteLine($"Registered templates: {string.Join(", ", registry.Names)}");

Console.WriteLine("Clone \"invoice\" and fill it in:");
var invoice = registry.Create("invoice");
invoice.Title = "Invoice #2026-001";
invoice.Sections.Add("Notes");
invoice.Metadata["client"] = "ACME Corp";
invoice.Metadata["status"] = "draft";
invoice.Style.Font = "Georgia";
invoice.Style.SizePt = 11;
Console.WriteLine($"  {invoice}");

Console.WriteLine("The \"invoice\" prototype is untouched:");
Console.WriteLine($"  {registry.Create("invoice")}");

var report = registry.Create("report");
var deep = report.Clone();
Console.WriteLine("Deep clone shares nothing with its source:");
Console.WriteLine($"  same sections: {Bool(ReferenceEquals(deep.Sections, report.Sections))}, " +
                  $"same metadata: {Bool(ReferenceEquals(deep.Metadata, report.Metadata))}, " +
                  $"same style: {Bool(ReferenceEquals(deep.Style, report.Style))}");

Console.WriteLine("Shallow copy (what NOT to do):");
var shallow = report.ShallowCopy();
Console.WriteLine($"  same sections: {Bool(ReferenceEquals(shallow.Sections, report.Sections))}, " +
                  $"same metadata: {Bool(ReferenceEquals(shallow.Metadata, report.Metadata))}, " +
                  $"same style: {Bool(ReferenceEquals(shallow.Style, report.Style))}");
shallow.Title = "Draft";
shallow.Sections[0] = "Cover page";
shallow.Metadata["status"] = "edited";
shallow.Style.Font = "Comic Sans";
Console.WriteLine($"  copy:     {shallow}");
Console.WriteLine($"  original: {report}");
Console.WriteLine("  -> only the title stayed independent; every shared reference leaked");

Console.WriteLine("Unknown template:");
try
{
    registry.Create("memo");
}
catch (KeyNotFoundException ex)
{
    Console.WriteLine($"  error: {ex.Message}");
}
