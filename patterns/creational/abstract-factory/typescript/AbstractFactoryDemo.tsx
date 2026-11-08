import { createContext, useContext, useState, type CSSProperties } from "react";
import { DarkTheme, LightTheme, type ThemeFactory, type ThemeName } from "./themeKit.ts";

const FACTORIES: Record<ThemeName, ThemeFactory> = { light: new LightTheme(), dark: new DarkTheme() };

// Visual tokens per family. The factory decides the family; these only paint it.
const PALETTE: Record<ThemeName, { panel: CSSProperties; button: CSSProperties; accent: string }> = {
  light: {
    panel: { background: "#ffffff", color: "#111827", border: "1px solid #d1d5db" },
    button: { background: "#ffffff", color: "#111827", border: "1px solid #9ca3af" },
    accent: "#2563eb",
  },
  dark: {
    panel: { background: "#111827", color: "#f9fafb", border: "1px solid #374151" },
    button: { background: "#1f2937", color: "#f9fafb", border: "1px solid #4b5563" },
    accent: "#60a5fa",
  },
};

/** The concrete factory travels down the tree through context: one place picks the family. */
const ThemeFactoryContext = createContext<ThemeFactory>(FACTORIES.light);

/** Themed button: asks the factory for the product, then paints it with that product's family. */
function ThemedButton({ label, onClick }: { label: string; onClick?: () => void }) {
  const button = useContext(ThemeFactoryContext).createButton(label);
  return (
    <button title={button.name} onClick={onClick} style={{ ...PALETTE[button.theme].button, padding: "0.25rem 0.75rem" }}>
      {button.label}
    </button>
  );
}

function ThemedCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const checkbox = useContext(ThemeFactoryContext).createCheckbox(label, checked);
  return (
    <label title={checkbox.name} style={{ display: "block" }}>
      <input
        type="checkbox"
        checked={checkbox.checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: PALETTE[checkbox.theme].accent }}
      />{" "}
      {checkbox.label}
    </label>
  );
}

/** Client: knows nothing about light or dark, only about "a button" and "a checkbox". */
function SettingsForm() {
  const [alerts, setAlerts] = useState(true);
  const [digest, setDigest] = useState(false);
  const [saved, setSaved] = useState("");
  return (
    <div>
      <ThemedCheckbox label="Email alerts" checked={alerts} onChange={setAlerts} />
      <ThemedCheckbox label="Weekly digest" checked={digest} onChange={setDigest} />
      <ThemedButton label="Save" onClick={() => setSaved(`alerts=${alerts}, digest=${digest}`)} />
      {saved && <p>Saved: {saved}</p>}
    </div>
  );
}

/**
 * React usage: the abstract factory is provided via context. Toggling the theme
 * swaps the whole family at once, so a light button can never appear next to a
 * dark checkbox.
 */
export default function AbstractFactoryDemo() {
  const [theme, setTheme] = useState<ThemeName>("light");
  const factory = FACTORIES[theme];
  return (
    <section>
      <h2>Abstract Factory — UI theme kit</h2>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Switch to {theme === "light" ? "dark" : "light"} theme
      </button>{" "}
      <span>Current factory: {factory.name}</span>
      <ThemeFactoryContext.Provider value={factory}>
        <div style={{ ...PALETTE[theme].panel, padding: "0.75rem", marginTop: "0.5rem", borderRadius: 6 }}>
          <SettingsForm />
        </div>
      </ThemeFactoryContext.Provider>
    </section>
  );
}
