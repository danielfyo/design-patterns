package main

import (
	"bytes"
	"io"
	"os"
	"slices"
	"strconv"
	"strings"
	"testing"
)

func TestEachFactoryCreatesProductsOfASingleFamily(t *testing.T) {
	tests := []struct {
		factory                       ThemeFactory
		name, theme, button, checkbox string
	}{
		{LightTheme{}, "LightTheme", "light", "LightButton", "LightCheckbox"},
		{DarkTheme{}, "DarkTheme", "dark", "DarkButton", "DarkCheckbox"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			button := tt.factory.CreateButton("Save")
			checkbox := tt.factory.CreateCheckbox("Sync", true)

			if tt.factory.Name() != tt.name {
				t.Errorf("Name() = %s", tt.factory.Name())
			}
			if button.Theme() != tt.theme || button.Name() != tt.button || button.Label() != "Save" {
				t.Errorf("button = %s/%s/%s", button.Theme(), button.Name(), button.Label())
			}
			if checkbox.Theme() != tt.theme || checkbox.Name() != tt.checkbox || !checkbox.Checked() {
				t.Errorf("checkbox = %s/%s/%t", checkbox.Theme(), checkbox.Name(), checkbox.Checked())
			}
		})
	}
}

func TestClientRendersEachFamilyWithTheSameCode(t *testing.T) {
	tests := []struct {
		factory ThemeFactory
		want    []string
	}{
		{LightTheme{}, []string{
			"[x] Email alerts    (light checkbox: tick #2563eb)",
			"[ ] Weekly digest   (light checkbox: tick #2563eb)",
			"[ Save ]            (light button: bg #ffffff, text #111827)",
		}},
		{DarkTheme{}, []string{
			"[x] Email alerts    (dark checkbox: tick #60a5fa)",
			"[ ] Weekly digest   (dark checkbox: tick #60a5fa)",
			"[ Save ]            (dark button: bg #1f2937, text #f9fafb)",
		}},
	}
	for _, tt := range tests {
		t.Run(tt.factory.Name(), func(t *testing.T) {
			got, err := SettingsScreen{Factory: tt.factory}.Render()
			if err != nil {
				t.Fatal(err)
			}
			if !slices.Equal(got, tt.want) {
				t.Errorf("Render() =\n%s\nwant\n%s", strings.Join(got, "\n"), strings.Join(tt.want, "\n"))
			}
		})
	}
}

func TestComposeRefusesToMixFamilies(t *testing.T) {
	lines, err := Compose(LightButton{widgetBase{label: "Save"}}, DarkCheckbox{widgetBase{label: "Email alerts", checked: true}})

	if lines != nil || err == nil || err.Error() != "cannot mix themes: LightButton is light, DarkCheckbox is dark" {
		t.Errorf("Compose() = %v, %v", lines, err)
	}
}

func TestComposeAcceptsHandMadeWidgetsOfOneFamily(t *testing.T) {
	lines, err := Compose(DarkCheckbox{widgetBase{label: "A"}}, DarkButton{widgetBase{label: "Go"}})

	if err != nil {
		t.Fatal(err)
	}
	if len(lines) != 2 || !strings.HasPrefix(lines[0], "[ ] A ") || !strings.HasPrefix(lines[1], "[ Go ] ") {
		t.Errorf("Compose() = %q", lines)
	}
}

// A third family defined by the test: the client must work with it unchanged.
type hcButton struct{ widgetBase }

func (hcButton) Name() string     { return "HighContrastButton" }
func (hcButton) Theme() string    { return "high-contrast" }
func (b hcButton) Render() string { return "HC button " + b.label }

type hcCheckbox struct{ widgetBase }

func (hcCheckbox) Name() string  { return "HighContrastCheckbox" }
func (hcCheckbox) Theme() string { return "high-contrast" }
func (c hcCheckbox) Render() string {
	return "HC checkbox " + c.label + "=" + strconv.FormatBool(c.checked)
}

type highContrastTheme struct{}

func (highContrastTheme) Name() string { return "HighContrastTheme" }
func (highContrastTheme) CreateButton(label string) Button {
	return hcButton{widgetBase{label: label}}
}
func (highContrastTheme) CreateCheckbox(label string, checked bool) Checkbox {
	return hcCheckbox{widgetBase{label: label, checked: checked}}
}

func TestANewFamilyPlugsIntoTheClientWithoutChangingIt(t *testing.T) {
	got, err := SettingsScreen{Factory: highContrastTheme{}}.Render()

	want := []string{"HC checkbox Email alerts=true", "HC checkbox Weekly digest=false", "HC button Save"}
	if err != nil || !slices.Equal(got, want) {
		t.Errorf("Render() = %q, %v", got, err)
	}
}

func TestDemoPrintsTheExpectedOutput(t *testing.T) {
	want, err := os.ReadFile("../expected_output.txt")
	if err != nil {
		t.Fatal(err)
	}
	if got := captureStdout(t, main); got != string(want) {
		t.Errorf("output mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

// captureStdout runs fn and returns everything it printed to os.Stdout.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	original := os.Stdout
	os.Stdout = w
	defer func() { os.Stdout = original }()

	fn()
	_ = w.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}
