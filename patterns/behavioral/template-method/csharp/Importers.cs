using System.Globalization;
using System.Text.Json;

namespace DesignPatterns.TemplateMethod;

/// <summary>One product row, whatever the source format.</summary>
public sealed record Product(string Sku, string Name, decimal Price);

/// <summary>What the template reports to the <c>OnComplete</c> hook.</summary>
public sealed record ImportSummary(int Read, int Dropped, int Saved, decimal Total);

/// <summary>
/// Abstract Class: <see cref="Import"/> is the template method. It fixes the order of
/// the steps; subclasses fill in <see cref="Parse"/> and may override the hooks.
/// </summary>
public abstract class DataImporter
{
    /// <summary>The template method. Not virtual: subclasses cannot change the skeleton.</summary>
    public ImportSummary Import(string raw)
    {
        var records = Parse(raw);
        Console.WriteLine($"[parse] {records.Count} record(s) read");
        var valid = Validate(records);
        var transformed = valid.Select(Transform).ToList();
        Save(transformed);
        var summary = new ImportSummary(
            records.Count, records.Count - valid.Count, transformed.Count, transformed.Sum(p => p.Price));
        OnComplete(summary);
        return summary;
    }

    /// <summary>Primitive operation: every format parses differently, so it is abstract.</summary>
    protected abstract IReadOnlyList<Product> Parse(string raw);

    /// <summary>Overridable step with a sensible default: drop incomplete or wrong rows.</summary>
    protected virtual IReadOnlyList<Product> Validate(IReadOnlyList<Product> records)
    {
        var valid = new List<Product>();
        foreach (var record in records)
        {
            if (string.IsNullOrWhiteSpace(record.Name))
                Console.WriteLine($"[validate] dropped {record.Sku}: empty name");
            else if (record.Price < 0)
                Console.WriteLine($"[validate] dropped {record.Sku}: negative price {record.Price:0.00}");
            else
                valid.Add(record);
        }
        return valid;
    }

    /// <summary>Hook: does nothing by default (identity).</summary>
    protected virtual Product Transform(Product record) => record;

    /// <summary>Common step shared by every importer (not virtual).</summary>
    private static void Save(IEnumerable<Product> records)
    {
        foreach (var p in records)
            Console.WriteLine($"[save] {p.Sku,-7} {p.Name,-16} ${p.Price:0.00}");
    }

    /// <summary>Hook: called at the end with the summary; subclasses may extend it.</summary>
    protected virtual void OnComplete(ImportSummary s) =>
        Console.WriteLine($"[complete] {s.Read} read, {s.Dropped} dropped, {s.Saved} saved, total ${s.Total:0.00}");
}

/// <summary>Concrete Class: parses "sku,name,price" lines and extends the completion hook.</summary>
public sealed class CsvImporter : DataImporter
{
    protected override IReadOnlyList<Product> Parse(string raw) =>
        raw.Trim()
            .Split('\n')
            .Skip(1) // header
            .Select(line => line.Trim().Split(','))
            .Select(f => new Product(f[0], f[1], decimal.Parse(f[2], CultureInfo.InvariantCulture)))
            .ToList();

    protected override void OnComplete(ImportSummary summary)
    {
        base.OnComplete(summary);
        Console.WriteLine("[notify] import report sent to the catalog team");
    }
}

/// <summary>Concrete Class: parses a JSON array and overrides the transform hook.</summary>
public sealed class JsonImporter : DataImporter
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = true };

    protected override IReadOnlyList<Product> Parse(string raw) =>
        JsonSerializer.Deserialize<List<Product>>(raw, Options) ?? [];

    protected override Product Transform(Product record)
    {
        var upper = record.Sku.ToUpperInvariant();
        Console.WriteLine($"[transform] {record.Sku} -> {upper}");
        return record with { Sku = upper };
    }
}
