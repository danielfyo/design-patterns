using DesignPatterns.Flyweight;

Console.WriteLine("=== Flyweight Pattern: Map markers ===");

(string Icon, string Color, int SizePx)[] specs =
[
    ("restaurant", "red", 32),
    ("hotel", "blue", 32),
    ("fuel", "green", 24),
];

const int markerCount = 10_000;
var factory = new MarkerStyleFactory();
var markers = new List<Marker>(markerCount);
for (var i = 0; i < markerCount; i++)
{
    var (icon, color, size) = specs[i % specs.Length];
    var lat = 40 + (i % 100) / 100.0;   // deterministic grid of positions
    var lng = -3 - (i / 100) / 100.0;
    markers.Add(new Marker(lat, lng, $"Place {i}", factory.GetStyle(icon, color, size)));
}

Console.WriteLine($"Created {markers.Count} markers with {factory.Requests} style requests");
Console.WriteLine($"Style objects created: {factory.Count}");

// Memory estimate with fixed sizes, so every language prints the same numbers.
long styleBytes = Sizes.IconBitmapBytes + Sizes.StyleFieldsBytes;
long without = (long)markerCount * (styleBytes + Sizes.MarkerFieldsBytes);
long with = (long)markerCount * Sizes.MarkerFieldsBytes + factory.Count * styleBytes;
Console.WriteLine($"Memory estimate (icon={Sizes.IconBitmapBytes} B, style fields={Sizes.StyleFieldsBytes} B, marker fields={Sizes.MarkerFieldsBytes} B):");
Console.WriteLine($"  without flyweight: {markerCount} x ({Sizes.IconBitmapBytes} + {Sizes.StyleFieldsBytes} + {Sizes.MarkerFieldsBytes}) = {without} B ({without / 1048576.0:0.00} MB)");
Console.WriteLine($"  with flyweight:    {markerCount} x {Sizes.MarkerFieldsBytes} + {factory.Count} x ({Sizes.IconBitmapBytes} + {Sizes.StyleFieldsBytes}) = {with} B ({with / 1048576.0:0.00} MB)");
Console.WriteLine($"  saved: {(1 - (double)with / without) * 100:0.00}%");

Console.WriteLine("Rendering a few markers:");
foreach (var index in new[] { 0, 1, 2, 3, 9999 })
{
    Console.WriteLine($"  #{index}: {markers[index].Draw()}");
}
Console.WriteLine($"Markers #0 and #3 share one style object: {(ReferenceEquals(markers[0].Style, markers[3].Style) ? "true" : "false")}");
