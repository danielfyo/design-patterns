namespace DesignPatterns.Flyweight;

/// <summary>Fixed byte sizes used for the (deterministic) memory estimate.</summary>
public static class Sizes
{
    /// <summary>The decoded icon bitmap: the heavy part of a style.</summary>
    public const int IconBitmapBytes = 20_000;

    /// <summary>Icon name, color, size and object header of a style.</summary>
    public const int StyleFieldsBytes = 64;

    /// <summary>Latitude, longitude, label reference and style reference of a marker.</summary>
    public const int MarkerFieldsBytes = 40;
}

/// <summary>
/// The Flyweight: intrinsic, immutable state shared by many markers (icon,
/// color, size and the heavy bitmap). Extrinsic state (position, label) is
/// passed in to <see cref="Draw"/> instead of being stored here.
/// </summary>
public sealed class MarkerStyle(string icon, string color, int sizePx)
{
    public string Icon { get; } = icon;
    public string Color { get; } = color;
    public int SizePx { get; } = sizePx;

    /// <summary>Imagine a decoded PNG: this is why styles must be shared.</summary>
    public byte[] IconBitmap { get; } = new byte[Sizes.IconBitmapBytes];

    public string Draw(double lat, double lng, string label) =>
        $"draw {Icon} icon ({Color}, {SizePx}px) at ({lat:0.0000}, {lng:0.0000}) label \"{label}\"";
}

/// <summary>
/// The Flyweight Factory: creates each distinct style once and hands out the
/// cached instance on every later request.
/// </summary>
public sealed class MarkerStyleFactory
{
    private readonly Dictionary<string, MarkerStyle> _styles = [];

    public int Requests { get; private set; }
    public int Count => _styles.Count;

    public MarkerStyle GetStyle(string icon, string color, int sizePx)
    {
        Requests++;
        var key = $"{icon}/{color}/{sizePx}px";
        if (!_styles.TryGetValue(key, out var style))
        {
            style = new MarkerStyle(icon, color, sizePx);
            _styles[key] = style;
            Console.WriteLine($"[factory] new style: {key}");
        }
        return style;
    }
}

/// <summary>
/// The Context: one per marker on the map. It stores only the extrinsic state
/// and a reference to the shared flyweight.
/// </summary>
public sealed record Marker(double Lat, double Lng, string Label, MarkerStyle Style)
{
    public string Draw() => Style.Draw(Lat, Lng, Label);
}
