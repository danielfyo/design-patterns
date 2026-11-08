// Run with: npx tsx patterns/structural/bridge/typescript/main.ts
import {
  CsvRenderer,
  HtmlRenderer,
  InventoryReport,
  MarkdownRenderer,
  SalesReport,
  type Renderer,
  type Report,
} from "./reports.ts";

console.log("=== Bridge Pattern: Reports x renderers ===");

const renderers: Renderer[] = [new MarkdownRenderer(), new HtmlRenderer(), new CsvRenderer()];

const reports: Report[] = [
  new SalesReport(renderers[0], [
    { region: "North", amount: 12500 },
    { region: "South", amount: 8300.5 },
    { region: "West", amount: 10199.5 },
  ]),
  new InventoryReport(renderers[0], [
    { product: "Keyboards", units: 42 },
    { product: "Monitors", units: 7 },
  ]),
];

// Every report works with every renderer: the two hierarchies vary independently.
for (const report of reports) {
  for (const renderer of renderers) {
    report.renderer = renderer;
    console.log(`--- ${report.name} as ${renderer.name} ---`);
    for (const line of report.render()) console.log(line);
  }
}

const combos = reports.length * renderers.length;
console.log(
  `${reports.length} reports x ${renderers.length} renderers = ${combos} combinations ` +
    `from ${reports.length + renderers.length} classes (inheritance alone would need ${combos})`,
);
