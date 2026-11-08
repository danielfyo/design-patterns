namespace DesignPatterns.AbstractFactory;

/// <summary>Something every widget has: a type name and the theme family it belongs to.</summary>
public interface IWidget
{
    string Name { get; }
    string Theme { get; }
    string Render();
}

/// <summary>Abstract Product A: a push button.</summary>
public interface IButton : IWidget;

/// <summary>Abstract Product B: a checkbox.</summary>
public interface ICheckbox : IWidget;

/// <summary>Concrete Product A1: a button of the light family.</summary>
public sealed class LightButton(string label) : IButton
{
    public string Name => nameof(LightButton);
    public string Theme => "light";
    public string Render() => $"{$"[ {label} ]",-20}(light button: bg #ffffff, text #111827)";
}

/// <summary>Concrete Product B1: a checkbox of the light family.</summary>
public sealed class LightCheckbox(string label, bool isChecked) : ICheckbox
{
    public string Name => nameof(LightCheckbox);
    public string Theme => "light";
    public string Render() => $"{$"[{(isChecked ? "x" : " ")}] {label}",-20}(light checkbox: tick #2563eb)";
}

/// <summary>Concrete Product A2: a button of the dark family.</summary>
public sealed class DarkButton(string label) : IButton
{
    public string Name => nameof(DarkButton);
    public string Theme => "dark";
    public string Render() => $"{$"[ {label} ]",-20}(dark button: bg #1f2937, text #f9fafb)";
}

/// <summary>Concrete Product B2: a checkbox of the dark family.</summary>
public sealed class DarkCheckbox(string label, bool isChecked) : ICheckbox
{
    public string Name => nameof(DarkCheckbox);
    public string Theme => "dark";
    public string Render() => $"{$"[{(isChecked ? "x" : " ")}] {label}",-20}(dark checkbox: tick #60a5fa)";
}

/// <summary>
/// Abstract Factory: one creation method per product of the family.
/// Whatever concrete factory you hold, the products it returns always match.
/// </summary>
public interface IThemeFactory
{
    string Name { get; }
    IButton CreateButton(string label);
    ICheckbox CreateCheckbox(string label, bool isChecked);
}

/// <summary>Concrete Factory 1: produces the light family.</summary>
public sealed class LightTheme : IThemeFactory
{
    public string Name => nameof(LightTheme);
    public IButton CreateButton(string label) => new LightButton(label);
    public ICheckbox CreateCheckbox(string label, bool isChecked) => new LightCheckbox(label, isChecked);
}

/// <summary>Concrete Factory 2: produces the dark family.</summary>
public sealed class DarkTheme : IThemeFactory
{
    public string Name => nameof(DarkTheme);
    public IButton CreateButton(string label) => new DarkButton(label);
    public ICheckbox CreateCheckbox(string label, bool isChecked) => new DarkCheckbox(label, isChecked);
}

/// <summary>
/// Client: renders a settings form using only the abstract factory and the abstract
/// products. It has no idea which theme it is drawing.
/// </summary>
public sealed class SettingsScreen(IThemeFactory factory)
{
    public IReadOnlyList<string> Render()
    {
        IWidget[] widgets =
        [
            factory.CreateCheckbox("Email alerts", true),
            factory.CreateCheckbox("Weekly digest", false),
            factory.CreateButton("Save"),
        ];
        return Layout.Compose(widgets);
    }
}

/// <summary>Helper that lays widgets out and refuses to mix families on one screen.</summary>
public static class Layout
{
    public static IReadOnlyList<string> Compose(IReadOnlyList<IWidget> widgets)
    {
        var first = widgets[0];
        foreach (var widget in widgets)
        {
            if (widget.Theme != first.Theme)
                throw new InvalidOperationException(
                    $"cannot mix themes: {first.Name} is {first.Theme}, {widget.Name} is {widget.Theme}");
        }
        return widgets.Select(w => w.Render()).ToList();
    }
}
