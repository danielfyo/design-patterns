import { describe, expect, it } from "vitest";
import {
  DarkButton,
  DarkCheckbox,
  DarkTheme,
  LightButton,
  LightTheme,
  SettingsScreen,
  compose,
  type Button,
  type Checkbox,
  type ThemeFactory,
  type ThemeName,
} from "./themeKit.ts";

describe("Abstract Factory: UI theme kit", () => {
  it.each([
    [new LightTheme(), "LightTheme", "light", "LightButton", "LightCheckbox"],
    [new DarkTheme(), "DarkTheme", "dark", "DarkButton", "DarkCheckbox"],
  ] as const)("%s creates products of a single family", (factory, name, theme, buttonName, checkboxName) => {
    const button = factory.createButton("Save");
    const checkbox = factory.createCheckbox("Sync", true);

    expect([factory.name, factory.theme]).toEqual([name, theme]);
    expect([button.theme, button.name, button.label]).toEqual([theme, buttonName, "Save"]);
    expect([checkbox.theme, checkbox.name, checkbox.checked]).toEqual([theme, checkboxName, true]);
  });

  it("renders the light family with the light factory", () => {
    expect(new SettingsScreen(new LightTheme()).render()).toEqual([
      "[x] Email alerts    (light checkbox: tick #2563eb)",
      "[ ] Weekly digest   (light checkbox: tick #2563eb)",
      "[ Save ]            (light button: bg #ffffff, text #111827)",
    ]);
  });

  it("renders the dark family with the same client code", () => {
    expect(new SettingsScreen(new DarkTheme()).render()).toEqual([
      "[x] Email alerts    (dark checkbox: tick #60a5fa)",
      "[ ] Weekly digest   (dark checkbox: tick #60a5fa)",
      "[ Save ]            (dark button: bg #1f2937, text #f9fafb)",
    ]);
  });

  it("refuses to compose widgets of different families", () => {
    expect(() => compose([new LightButton("Save"), new DarkCheckbox("Email alerts", true)])).toThrow(
      "cannot mix themes: LightButton is light, DarkCheckbox is dark",
    );
  });

  it("accepts hand-made widgets of one family", () => {
    const lines = compose([new DarkCheckbox("A", false), new DarkButton("Go")]);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^\[ \] A /);
    expect(lines[1]).toMatch(/^\[ Go \] /);
  });

  it("lets a new family plug into the client without changing it", () => {
    // The family is a test double; the cast widens ThemeName to accept it.
    const theme = "high-contrast" as ThemeName;
    const highContrast: ThemeFactory = {
      name: "HighContrastTheme",
      theme,
      createButton: (label): Button => ({ name: "HcButton", theme, label, render: () => `HC button ${label}` }),
      createCheckbox: (label, checked): Checkbox => ({
        name: "HcCheckbox",
        theme,
        label,
        checked,
        render: () => `HC checkbox ${label}=${checked}`,
      }),
    };

    expect(new SettingsScreen(highContrast).render()).toEqual([
      "HC checkbox Email alerts=true",
      "HC checkbox Weekly digest=false",
      "HC button Save",
    ]);
  });
});
