using DesignPatterns.TemplateMethod;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class TemplateMethodTests
{
    private const string Csv = """
        sku,name,price
        bk-001,Clean Code,32.50
        bk-002,,18.00
        bk-003,Refactoring,-5.00
        bk-004,Design Patterns,45.00
        """;

    private const string Json = """
        [
          {"sku": "el-100", "name": "USB-C cable", "price": 9.99},
          {"sku": "el-200", "name": "Headphones", "price": 59.90},
          {"sku": "el-300", "name": "", "price": 12.00}
        ]
        """;

    /// <summary>A test subclass that records the order in which the template calls each step.</summary>
    private sealed class RecordingImporter(params Product[] products) : DataImporter
    {
        public List<string> Calls { get; } = [];

        protected override IReadOnlyList<Product> Parse(string raw)
        {
            Calls.Add("parse");
            return products;
        }

        protected override IReadOnlyList<Product> Validate(IReadOnlyList<Product> records)
        {
            Calls.Add("validate");
            return base.Validate(records);
        }

        protected override Product Transform(Product record)
        {
            Calls.Add($"transform {record.Sku}");
            return record;
        }

        protected override void OnComplete(ImportSummary summary) => Calls.Add("complete");
    }

    [Fact]
    public void Template_calls_the_steps_in_a_fixed_order()
    {
        using var console = new ConsoleCapture();
        var importer = new RecordingImporter(new Product("a", "A", 1m), new Product("b", "B", 2m));

        importer.Import("ignored");

        Assert.Equal(["parse", "validate", "transform a", "transform b", "complete"], importer.Calls);
    }

    [Fact]
    public void Csv_importer_drops_invalid_rows_and_summarises_the_rest()
    {
        using var console = new ConsoleCapture();

        var summary = new CsvImporter().Import(Csv);

        Assert.Equal(new ImportSummary(Read: 4, Dropped: 2, Saved: 2, Total: 77.50m), summary);
        Assert.Contains("[validate] dropped bk-002: empty name", console.Output, StringComparison.Ordinal);
        Assert.Contains("[validate] dropped bk-003: negative price -5.00", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Csv_importer_extends_the_completion_hook_after_the_default()
    {
        using var console = new ConsoleCapture();

        new CsvImporter().Import(Csv);

        var lines = console.Output.TrimEnd('\n').Split('\n');
        Assert.StartsWith("[complete] ", lines[^2], StringComparison.Ordinal);
        Assert.Equal("[notify] import report sent to the catalog team", lines[^1]);
    }

    [Fact]
    public void Json_importer_overrides_the_transform_hook()
    {
        using var console = new ConsoleCapture();

        var summary = new JsonImporter().Import(Json);

        Assert.Equal(new ImportSummary(Read: 3, Dropped: 1, Saved: 2, Total: 69.89m), summary);
        Assert.Contains("[transform] el-100 -> EL-100", console.Output, StringComparison.Ordinal);
        Assert.Contains("[save] EL-200 ", console.Output, StringComparison.Ordinal);
        Assert.DoesNotContain("[notify]", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Default_validation_treats_a_whitespace_name_as_empty()
    {
        using var console = new ConsoleCapture();
        var importer = new RecordingImporter(new Product("x", "   ", 1m), new Product("y", "Y", 0m));

        var summary = importer.Import("ignored");

        Assert.Equal(new ImportSummary(Read: 2, Dropped: 1, Saved: 1, Total: 0m), summary);
    }

    [Fact]
    public void Importing_nothing_yields_an_empty_summary()
    {
        using var console = new ConsoleCapture();

        var summary = new CsvImporter().Import("sku,name,price");

        Assert.Equal(new ImportSummary(0, 0, 0, 0m), summary);
        Assert.StartsWith("[parse] 0 record(s) read\n[complete] 0 read", console.Output, StringComparison.Ordinal);
    }
}
