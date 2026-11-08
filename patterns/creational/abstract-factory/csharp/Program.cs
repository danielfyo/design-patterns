using DesignPatterns.AbstractFactory;

Console.WriteLine("=== Abstract Factory Pattern: UI theme kit ===");

// The concrete factory is chosen once (e.g. from user preferences)...
IThemeFactory[] themes = [new LightTheme(), new DarkTheme()];

// ...and the client code is identical for every family.
foreach (var theme in themes)
{
    Console.WriteLine($"Settings screen with {theme.Name}:");
    foreach (var line in new SettingsScreen(theme).Render())
    {
        Console.WriteLine($"  {line}");
    }
}

Console.WriteLine("Picking the factory from a preference string:");
foreach (var preference in new[] { "dark", "light" })
{
    IThemeFactory factory = preference == "dark" ? new DarkTheme() : new LightTheme();
    Console.WriteLine($"  preference={preference,-5} -> {factory.Name,-10} -> {factory.CreateCheckbox("Sync", true).Name}");
}

Console.WriteLine("Mixing families by hand (bypassing the factory):");
try
{
    Layout.Compose([new LightButton("Save"), new DarkCheckbox("Email alerts", true)]);
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"  error: {ex.Message}");
}
