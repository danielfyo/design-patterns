// Run with: npx tsx patterns/structural/flyweight/typescript/main.ts
import { MarkerStyleFactory, Sizes, createMarkers } from "./markers.ts";

console.log("=== Flyweight Pattern: Map markers ===");

const markerCount = 10_000;
const factory = new MarkerStyleFactory();
const markers = createMarkers(markerCount, factory);

console.log(`Created ${markers.length} markers with ${factory.requests} style requests`);
console.log(`Style objects created: ${factory.count}`);

// Memory estimate with fixed sizes, so every language prints the same numbers.
const { iconBitmapBytes: icon, styleFieldsBytes: fields, markerFieldsBytes: marker } = Sizes;
const styleBytes = icon + fields;
const without = markerCount * (styleBytes + marker);
const withFlyweight = markerCount * marker + factory.count * styleBytes;
const mb = (bytes: number): string => (bytes / 1048576).toFixed(2);
console.log(`Memory estimate (icon=${icon} B, style fields=${fields} B, marker fields=${marker} B):`);
console.log(`  without flyweight: ${markerCount} x (${icon} + ${fields} + ${marker}) = ${without} B (${mb(without)} MB)`);
console.log(
  `  with flyweight:    ${markerCount} x ${marker} + ${factory.count} x (${icon} + ${fields}) = ${withFlyweight} B (${mb(withFlyweight)} MB)`,
);
console.log(`  saved: ${((1 - withFlyweight / without) * 100).toFixed(2)}%`);

console.log("Rendering a few markers:");
for (const index of [0, 1, 2, 3, 9999]) {
  console.log(`  #${index}: ${markers[index].draw()}`);
}
console.log(`Markers #0 and #3 share one style object: ${markers[0].style === markers[3].style}`);
