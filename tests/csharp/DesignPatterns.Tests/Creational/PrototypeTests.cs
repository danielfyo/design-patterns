using DesignPatterns.Prototype;

namespace DesignPatterns.Tests.Creational;

public sealed class PrototypeTests
{
    private const string ReportText =
        "Quarterly Report | Times 12pt | sections=[Summary, Findings] | metadata={owner=analytics, status=template}";

    private static Document NewReport() => new(
        "Quarterly Report",
        ["Summary", "Findings"],
        new() { ["status"] = "template", ["owner"] = "analytics" },
        new Style("Times", 12));

    [Fact]
    public void Clone_copies_every_value()
    {
        var clone = NewReport().Clone();

        Assert.Equal(ReportText, clone.ToString());
    }

    [Fact]
    public void Clone_is_deep_and_shares_no_mutable_state()
    {
        var original = NewReport();

        var clone = original.Clone();

        Assert.NotSame(original.Sections, clone.Sections);
        Assert.NotSame(original.Metadata, clone.Metadata);
        Assert.NotSame(original.Style, clone.Style);
        Assert.Equal(original.Style, clone.Style);
    }

    [Fact]
    public void Mutating_a_clone_leaves_the_original_intact()
    {
        var original = NewReport();
        var clone = original.Clone();

        clone.Title = "Draft";
        clone.Sections[0] = "Cover page";
        clone.Sections.Add("Appendix");
        clone.Metadata["status"] = "edited";
        clone.Style.Font = "Georgia";
        clone.Style.SizePt = 9;

        Assert.Equal(ReportText, original.ToString());
        Assert.Equal(
            "Draft | Georgia 9pt | sections=[Cover page, Findings, Appendix] | metadata={owner=analytics, status=edited}",
            clone.ToString());
    }

    [Fact]
    public void Shallow_copy_shares_references_so_edits_leak_into_the_original()
    {
        var original = NewReport();
        var shallow = original.ShallowCopy();

        shallow.Title = "Draft";
        shallow.Sections[0] = "Cover page";
        shallow.Metadata["status"] = "edited";
        shallow.Style.Font = "Comic Sans";

        Assert.Same(original.Sections, shallow.Sections);
        Assert.Same(original.Style, shallow.Style);
        Assert.Equal("Quarterly Report", original.Title);
        Assert.Equal(
            "Quarterly Report | Comic Sans 12pt | sections=[Cover page, Findings] | metadata={owner=analytics, status=edited}",
            original.ToString());
    }

    [Fact]
    public void Registry_stores_a_private_clone_of_the_registered_prototype()
    {
        var registry = new TemplateRegistry();
        var source = NewReport();
        registry.Register("report", source);

        source.Sections.Clear();
        source.Style.Font = "Comic Sans";

        Assert.Equal(ReportText, registry.Create("report").ToString());
    }

    [Fact]
    public void Registry_hands_out_independent_clones()
    {
        var registry = new TemplateRegistry();
        registry.Register("report", NewReport());

        var first = registry.Create("report");
        first.Metadata["status"] = "draft";
        var second = registry.Create("report");

        Assert.NotSame(first, second);
        Assert.Equal("template", second.Metadata["status"]);
    }

    [Fact]
    public void Registry_lists_names_in_ordinal_order()
    {
        var registry = new TemplateRegistry();
        registry.Register("report", NewReport());
        registry.Register("invoice", NewReport());
        registry.Register("Memo", NewReport());

        Assert.Equal(["Memo", "invoice", "report"], registry.Names);
    }

    [Fact]
    public void Registry_rejects_an_unknown_template()
    {
        var ex = Assert.Throws<KeyNotFoundException>(() => new TemplateRegistry().Create("memo"));

        Assert.Equal("no template named \"memo\"", ex.Message);
    }
}
