// Run with: npx tsx patterns/creational/prototype/typescript/main.ts
import { defaultRegistry } from "./documents.ts";

console.log("=== Prototype Pattern: Document templates ===");

const registry = defaultRegistry();
console.log(`Registered templates: ${registry.names.join(", ")}`);

console.log('Clone "invoice" and fill it in:');
const invoice = registry.create("invoice");
invoice.title = "Invoice #2026-001";
invoice.sections.push("Notes");
invoice.metadata.set("client", "ACME Corp");
invoice.metadata.set("status", "draft");
invoice.style.font = "Georgia";
invoice.style.sizePt = 11;
console.log(`  ${invoice}`);

console.log('The "invoice" prototype is untouched:');
console.log(`  ${registry.create("invoice")}`);

const report = registry.create("report");
const deep = report.clone();
console.log("Deep clone shares nothing with its source:");
console.log(
  `  same sections: ${deep.sections === report.sections}, ` +
    `same metadata: ${deep.metadata === report.metadata}, ` +
    `same style: ${deep.style === report.style}`,
);

console.log("Shallow copy (what NOT to do):");
const shallow = report.shallowCopy();
console.log(
  `  same sections: ${shallow.sections === report.sections}, ` +
    `same metadata: ${shallow.metadata === report.metadata}, ` +
    `same style: ${shallow.style === report.style}`,
);
shallow.title = "Draft";
shallow.sections[0] = "Cover page";
shallow.metadata.set("status", "edited");
shallow.style.font = "Comic Sans";
console.log(`  copy:     ${shallow}`);
console.log(`  original: ${report}`);
console.log("  -> only the title stayed independent; every shared reference leaked");

console.log("Unknown template:");
try {
  registry.create("memo");
} catch (err) {
  console.log(`  error: ${(err as Error).message}`);
}
