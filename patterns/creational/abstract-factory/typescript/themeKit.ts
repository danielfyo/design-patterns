/**
 * Abstract Factory pattern: a UI theme kit that produces matching families
 * of widgets (buttons and checkboxes).
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (AbstractFactoryDemo.tsx).
 */

export type ThemeName = "light" | "dark";

/** Something every widget has: a type name and the theme family it belongs to. */
export interface Widget {
  readonly name: string;
  readonly theme: ThemeName;
  render(): string;
}

/** Abstract Product A: a push button. */
export interface Button extends Widget {
  readonly label: string;
}

/** Abstract Product B: a checkbox. */
export interface Checkbox extends Widget {
  readonly label: string;
  readonly checked: boolean;
}

const box = (checked: boolean, label: string) => `[${checked ? "x" : " "}] ${label}`.padEnd(20);

/** Concrete Product A1: a button of the light family. */
export class LightButton implements Button {
  readonly name = "LightButton";
  readonly theme = "light";
  constructor(readonly label: string) {}
  render(): string {
    return `${`[ ${this.label} ]`.padEnd(20)}(light button: bg #ffffff, text #111827)`;
  }
}

/** Concrete Product B1: a checkbox of the light family. */
export class LightCheckbox implements Checkbox {
  readonly name = "LightCheckbox";
  readonly theme = "light";
  constructor(
    readonly label: string,
    readonly checked: boolean,
  ) {}
  render(): string {
    return `${box(this.checked, this.label)}(light checkbox: tick #2563eb)`;
  }
}

/** Concrete Product A2: a button of the dark family. */
export class DarkButton implements Button {
  readonly name = "DarkButton";
  readonly theme = "dark";
  constructor(readonly label: string) {}
  render(): string {
    return `${`[ ${this.label} ]`.padEnd(20)}(dark button: bg #1f2937, text #f9fafb)`;
  }
}

/** Concrete Product B2: a checkbox of the dark family. */
export class DarkCheckbox implements Checkbox {
  readonly name = "DarkCheckbox";
  readonly theme = "dark";
  constructor(
    readonly label: string,
    readonly checked: boolean,
  ) {}
  render(): string {
    return `${box(this.checked, this.label)}(dark checkbox: tick #60a5fa)`;
  }
}

/**
 * Abstract Factory: one creation method per product of the family.
 * Whatever concrete factory you hold, the products it returns always match.
 */
export interface ThemeFactory {
  readonly name: string;
  readonly theme: ThemeName;
  createButton(label: string): Button;
  createCheckbox(label: string, checked: boolean): Checkbox;
}

/** Concrete Factory 1: produces the light family. */
export class LightTheme implements ThemeFactory {
  readonly name = "LightTheme";
  readonly theme = "light";
  createButton(label: string): Button {
    return new LightButton(label);
  }
  createCheckbox(label: string, checked: boolean): Checkbox {
    return new LightCheckbox(label, checked);
  }
}

/** Concrete Factory 2: produces the dark family. */
export class DarkTheme implements ThemeFactory {
  readonly name = "DarkTheme";
  readonly theme = "dark";
  createButton(label: string): Button {
    return new DarkButton(label);
  }
  createCheckbox(label: string, checked: boolean): Checkbox {
    return new DarkCheckbox(label, checked);
  }
}

/** Lays widgets out and refuses to mix families on one screen. */
export function compose(widgets: readonly Widget[]): string[] {
  const [first] = widgets;
  for (const widget of widgets) {
    if (widget.theme !== first.theme) {
      throw new Error(`cannot mix themes: ${first.name} is ${first.theme}, ${widget.name} is ${widget.theme}`);
    }
  }
  return widgets.map((w) => w.render());
}

/**
 * Client: renders a settings form using only the abstract factory and the
 * abstract products. It has no idea which theme it is drawing.
 */
export class SettingsScreen {
  constructor(private readonly factory: ThemeFactory) {}

  render(): string[] {
    return compose([
      this.factory.createCheckbox("Email alerts", true),
      this.factory.createCheckbox("Weekly digest", false),
      this.factory.createButton("Save"),
    ]);
  }
}
