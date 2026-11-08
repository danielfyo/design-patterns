using DesignPatterns.AbstractFactory;

namespace DesignPatterns.Tests.Creational;

public sealed class AbstractFactoryTests
{
    [Theory]
    [InlineData(typeof(LightTheme), "light", "LightButton", "LightCheckbox")]
    [InlineData(typeof(DarkTheme), "dark", "DarkButton", "DarkCheckbox")]
    public void Each_factory_creates_products_of_a_single_family(
        Type factoryType, string theme, string buttonName, string checkboxName)
    {
        var factory = (IThemeFactory)Activator.CreateInstance(factoryType)!;

        var button = factory.CreateButton("Save");
        var checkbox = factory.CreateCheckbox("Sync", true);

        Assert.Equal(factoryType.Name, factory.Name);
        Assert.Equal((theme, buttonName), (button.Theme, button.Name));
        Assert.Equal((theme, checkboxName), (checkbox.Theme, checkbox.Name));
    }

    [Fact]
    public void Client_renders_the_light_family_with_the_light_factory()
    {
        var lines = new SettingsScreen(new LightTheme()).Render();

        Assert.Equal(
            [
                "[x] Email alerts    (light checkbox: tick #2563eb)",
                "[ ] Weekly digest   (light checkbox: tick #2563eb)",
                "[ Save ]            (light button: bg #ffffff, text #111827)",
            ],
            lines);
    }

    [Fact]
    public void Same_client_code_renders_the_dark_family_with_the_dark_factory()
    {
        var lines = new SettingsScreen(new DarkTheme()).Render();

        Assert.Equal(
            [
                "[x] Email alerts    (dark checkbox: tick #60a5fa)",
                "[ ] Weekly digest   (dark checkbox: tick #60a5fa)",
                "[ Save ]            (dark button: bg #1f2937, text #f9fafb)",
            ],
            lines);
    }

    [Fact]
    public void Layout_refuses_to_mix_families()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => Layout.Compose([new LightButton("Save"), new DarkCheckbox("Email alerts", true)]));

        Assert.Equal("cannot mix themes: LightButton is light, DarkCheckbox is dark", ex.Message);
    }

    [Fact]
    public void Layout_accepts_hand_made_widgets_of_one_family()
    {
        var lines = Layout.Compose([new DarkCheckbox("A", false), new DarkButton("Go")]);

        Assert.Equal(2, lines.Count);
        Assert.StartsWith("[ ] A ", lines[0], StringComparison.Ordinal);
        Assert.StartsWith("[ Go ] ", lines[1], StringComparison.Ordinal);
    }

    [Fact]
    public void A_new_family_plugs_into_the_client_without_changing_it()
    {
        var lines = new SettingsScreen(new HighContrastTheme()).Render();

        Assert.Equal(["HC checkbox Email alerts=True", "HC checkbox Weekly digest=False", "HC button Save"], lines);
    }

    private sealed class HighContrastButton(string label) : IButton
    {
        public string Name => nameof(HighContrastButton);
        public string Theme => "high-contrast";
        public string Render() => $"HC button {label}";
    }

    private sealed class HighContrastCheckbox(string label, bool isChecked) : ICheckbox
    {
        public string Name => nameof(HighContrastCheckbox);
        public string Theme => "high-contrast";
        public string Render() => $"HC checkbox {label}={isChecked}";
    }

    private sealed class HighContrastTheme : IThemeFactory
    {
        public string Name => nameof(HighContrastTheme);
        public IButton CreateButton(string label) => new HighContrastButton(label);
        public ICheckbox CreateCheckbox(string label, bool isChecked) => new HighContrastCheckbox(label, isChecked);
    }
}
