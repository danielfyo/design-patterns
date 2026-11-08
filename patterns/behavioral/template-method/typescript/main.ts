// Run with: npx tsx patterns/behavioral/template-method/typescript/main.ts
import { CSV_SAMPLE, CsvImporter, JSON_SAMPLE, JsonImporter } from "./importers.ts";

console.log("=== Template Method Pattern: Data importer ===");

// The client calls the same template method; each subclass fills in different steps.
console.log("--- CsvImporter ---");
new CsvImporter().import(CSV_SAMPLE);

console.log("--- JsonImporter ---");
new JsonImporter().import(JSON_SAMPLE);
