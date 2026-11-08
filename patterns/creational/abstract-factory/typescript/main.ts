// Run with: npx tsx patterns/creational/abstract-factory/typescript/main.ts
import {
  DarkCheckbox,
  DarkTheme,
  LightButton,
  LightTheme,
  SettingsScreen,
  compose,
  type ThemeFactory,
} from "./themeKit.ts";

console.log("=== Abstract Factory Pattern: UI theme kit ===");

// The concrete factory is chosen once (e.g. from user preferences)...
const themes: ThemeFactory[] = [new LightTheme(), new DarkTheme()];

// ...and the client code is identical for every family.
for (const theme of themes) {
  console.log(`Settings screen with ${theme.name}:`);
  for (const line of new SettingsScreen(theme).render()) {
    console.log(`  ${line}`);
  }
}

console.log("Picking the factory from a preference string:");
for (const preference of ["dark", "light"]) {
  const factory: ThemeFactory = preference === "dark" ? new DarkTheme() : new LightTheme();
  console.log(
    `  preference=${preference.padEnd(5)} -> ${factory.name.padEnd(10)} -> ${factory.createCheckbox("Sync", true).name}`,
  );
}

console.log("Mixing families by hand (bypassing the factory):");
try {
  compose([new LightButton("Save"), new DarkCheckbox("Email alerts", true)]);
} catch (err) {
  console.log(`  error: ${(err as Error).message}`);
}
