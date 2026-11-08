// Abstract Factory pattern: a UI theme kit that produces matching families of
// widgets (buttons and checkboxes).
//
// Run with: go run ./patterns/creational/abstract-factory/go
package main

import (
	"fmt"
	"strings"
)

// Widget is what every product has: a type name, a theme family and a rendering.
type Widget interface {
	Name() string
	Theme() string
	Render() string
}

// Button is Abstract Product A.
type Button interface {
	Widget
	Label() string
}

// Checkbox is Abstract Product B.
type Checkbox interface {
	Widget
	Label() string
	Checked() bool
}

// widgetBase holds the fields shared by every concrete widget. It is embedded,
// so its methods are promoted to the concrete types.
type widgetBase struct {
	label   string
	checked bool
}

func (w widgetBase) Label() string { return w.label }
func (w widgetBase) Checked() bool { return w.checked }

func (w widgetBase) box() string {
	mark := " "
	if w.checked {
		mark = "x"
	}
	return fmt.Sprintf("%-20s", "["+mark+"] "+w.label)
}

// LightButton is Concrete Product A1: a button of the light family.
type LightButton struct{ widgetBase }

func (LightButton) Name() string  { return "LightButton" }
func (LightButton) Theme() string { return "light" }
func (b LightButton) Render() string {
	return fmt.Sprintf("%-20s(light button: bg #ffffff, text #111827)", "[ "+b.label+" ]")
}

// LightCheckbox is Concrete Product B1: a checkbox of the light family.
type LightCheckbox struct{ widgetBase }

func (LightCheckbox) Name() string     { return "LightCheckbox" }
func (LightCheckbox) Theme() string    { return "light" }
func (c LightCheckbox) Render() string { return c.box() + "(light checkbox: tick #2563eb)" }

// DarkButton is Concrete Product A2: a button of the dark family.
type DarkButton struct{ widgetBase }

func (DarkButton) Name() string  { return "DarkButton" }
func (DarkButton) Theme() string { return "dark" }
func (b DarkButton) Render() string {
	return fmt.Sprintf("%-20s(dark button: bg #1f2937, text #f9fafb)", "[ "+b.label+" ]")
}

// DarkCheckbox is Concrete Product B2: a checkbox of the dark family.
type DarkCheckbox struct{ widgetBase }

func (DarkCheckbox) Name() string     { return "DarkCheckbox" }
func (DarkCheckbox) Theme() string    { return "dark" }
func (c DarkCheckbox) Render() string { return c.box() + "(dark checkbox: tick #60a5fa)" }

// ThemeFactory is the Abstract Factory: one creation method per product of the
// family. Whatever concrete factory you hold, its products always match.
type ThemeFactory interface {
	Name() string
	CreateButton(label string) Button
	CreateCheckbox(label string, checked bool) Checkbox
}

// LightTheme is Concrete Factory 1: produces the light family.
type LightTheme struct{}

func (LightTheme) Name() string { return "LightTheme" }
func (LightTheme) CreateButton(label string) Button {
	return LightButton{widgetBase{label: label}}
}
func (LightTheme) CreateCheckbox(label string, checked bool) Checkbox {
	return LightCheckbox{widgetBase{label: label, checked: checked}}
}

// DarkTheme is Concrete Factory 2: produces the dark family.
type DarkTheme struct{}

func (DarkTheme) Name() string { return "DarkTheme" }
func (DarkTheme) CreateButton(label string) Button {
	return DarkButton{widgetBase{label: label}}
}
func (DarkTheme) CreateCheckbox(label string, checked bool) Checkbox {
	return DarkCheckbox{widgetBase{label: label, checked: checked}}
}

// Compose lays widgets out and refuses to mix families on one screen.
func Compose(widgets ...Widget) ([]string, error) {
	first := widgets[0]
	lines := make([]string, 0, len(widgets))
	for _, w := range widgets {
		if w.Theme() != first.Theme() {
			return nil, fmt.Errorf("cannot mix themes: %s is %s, %s is %s",
				first.Name(), first.Theme(), w.Name(), w.Theme())
		}
		lines = append(lines, w.Render())
	}
	return lines, nil
}

// SettingsScreen is the Client: it renders a form using only the abstract
// factory and the abstract products.
type SettingsScreen struct {
	Factory ThemeFactory
}

func (s SettingsScreen) Render() ([]string, error) {
	return Compose(
		s.Factory.CreateCheckbox("Email alerts", true),
		s.Factory.CreateCheckbox("Weekly digest", false),
		s.Factory.CreateButton("Save"),
	)
}

func main() {
	fmt.Println("=== Abstract Factory Pattern: UI theme kit ===")

	// The concrete factory is chosen once (e.g. from user preferences)...
	themes := []ThemeFactory{LightTheme{}, DarkTheme{}}

	// ...and the client code is identical for every family.
	for _, theme := range themes {
		fmt.Printf("Settings screen with %s:\n", theme.Name())
		lines, err := SettingsScreen{Factory: theme}.Render()
		if err != nil {
			fmt.Println("  error:", err)
			continue
		}
		fmt.Println("  " + strings.Join(lines, "\n  "))
	}

	fmt.Println("Picking the factory from a preference string:")
	for _, preference := range []string{"dark", "light"} {
		var factory ThemeFactory = LightTheme{}
		if preference == "dark" {
			factory = DarkTheme{}
		}
		checkbox := factory.CreateCheckbox("Sync", true)
		fmt.Printf("  preference=%-5s -> %-10s -> %s\n", preference, factory.Name(), checkbox.Name())
	}

	fmt.Println("Mixing families by hand (bypassing the factory):")
	_, err := Compose(LightButton{widgetBase{label: "Save"}}, DarkCheckbox{widgetBase{label: "Email alerts", checked: true}})
	if err != nil {
		fmt.Println("  error:", err)
	}
}
