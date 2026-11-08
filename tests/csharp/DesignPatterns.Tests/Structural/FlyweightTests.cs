using DesignPatterns.Flyweight;

namespace DesignPatterns.Tests.Structural;

[Collection("Console")]
public sealed class FlyweightTests
{
    [Fact]
    public void Factory_reuses_the_instance_for_the_same_intrinsic_state()
    {
        using var console = new ConsoleCapture();
        var factory = new MarkerStyleFactory();

        var first = factory.GetStyle("hotel", "blue", 32);
        var second = factory.GetStyle("hotel", "blue", 32);

        Assert.Same(first, second);
        Assert.Equal(1, factory.Count);
    }

    [Theory]
    [InlineData("fuel", "blue", 32)]
    [InlineData("hotel", "red", 32)]
    [InlineData("hotel", "blue", 24)]
    public void Factory_creates_a_new_style_when_any_intrinsic_field_differs(string icon, string color, int sizePx)
    {
        using var console = new ConsoleCapture();
        var factory = new MarkerStyleFactory();
        var hotel = factory.GetStyle("hotel", "blue", 32);

        var other = factory.GetStyle(icon, color, sizePx);

        Assert.NotSame(hotel, other);
        Assert.Equal(2, factory.Count);
    }

    [Fact]
    public void Factory_counts_every_request_but_announces_each_style_once()
    {
        using var console = new ConsoleCapture();
        var factory = new MarkerStyleFactory();

        for (var i = 0; i < 5; i++)
        {
            factory.GetStyle("fuel", "green", 24);
        }

        Assert.Equal(5, factory.Requests);
        Assert.Equal(1, factory.Count);
        Assert.Equal("[factory] new style: fuel/green/24px\n", console.Output);
    }

    [Fact]
    public void Many_markers_share_a_handful_of_style_objects()
    {
        using var console = new ConsoleCapture();
        var factory = new MarkerStyleFactory();
        (string Icon, string Color, int Size)[] specs = [("restaurant", "red", 32), ("hotel", "blue", 32), ("fuel", "green", 24)];

        var markers = Enumerable.Range(0, 300)
            .Select(i => new Marker(40, -3, $"Place {i}", factory.GetStyle(specs[i % 3].Icon, specs[i % 3].Color, specs[i % 3].Size)))
            .ToList();

        Assert.Equal(3, factory.Count);
        Assert.Equal(3, markers.Select(m => m.Style).Distinct().Count());
        Assert.Same(markers[0].Style, markers[297].Style);
    }

    [Fact]
    public void Marker_draw_combines_extrinsic_and_shared_intrinsic_state()
    {
        using var console = new ConsoleCapture();
        var style = new MarkerStyleFactory().GetStyle("restaurant", "red", 32);

        var a = new Marker(40.03, -3, "Place 3", style);
        var b = new Marker(40.99, -3.99, "Place 9999", style);

        Assert.Equal("draw restaurant icon (red, 32px) at (40.0300, -3.0000) label \"Place 3\"", a.Draw());
        Assert.Equal("draw restaurant icon (red, 32px) at (40.9900, -3.9900) label \"Place 9999\"", b.Draw());
    }

    [Fact]
    public void Style_holds_the_heavy_bitmap_while_markers_only_reference_it()
    {
        using var console = new ConsoleCapture();
        var style = new MarkerStyleFactory().GetStyle("hotel", "blue", 32);

        var marker = new Marker(1, 2, "x", style);

        Assert.Equal(Sizes.IconBitmapBytes, style.IconBitmap.Length);
        Assert.Same(style.IconBitmap, marker.Style.IconBitmap);
    }
}
