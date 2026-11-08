import { useState } from "react";
import {
  CsvRenderer,
  HtmlRenderer,
  InventoryReport,
  MarkdownRenderer,
  SalesReport,
  type Renderer,
  type Report,
} from "./reports.ts";

const RENDERERS: Renderer[] = [new MarkdownRenderer(), new HtmlRenderer(), new CsvRenderer()];

// Each report is built with its data only; the renderer is chosen separately by the UI.
const REPORT_FACTORIES: { name: string; create: (renderer: Renderer) => Report }[] = [
  {
    name: "Sales report",
    create: (r) =>
      new SalesReport(r, [
        { region: "North", amount: 12500 },
        { region: "South", amount: 8300.5 },
        { region: "West", amount: 10199.5 },
      ]),
  },
  {
    name: "Inventory report",
    create: (r) =>
      new InventoryReport(r, [
        { product: "Keyboards", units: 42 },
        { product: "Monitors", units: 7 },
      ]),
  },
];

/**
 * React usage: two independent choices (what to report, how to render it) combine freely.
 * The component never switches on "sales + HTML": it just connects the two halves of the bridge.
 */
export default function BridgeDemo() {
  const [reportIndex, setReportIndex] = useState(0);
  const [rendererIndex, setRendererIndex] = useState(0);

  const report = REPORT_FACTORIES[reportIndex].create(RENDERERS[rendererIndex]);

  return (
    <section>
      <h2>Bridge — Reports × renderers</h2>
      <div style={{ display: "flex", gap: 24 }}>
        <fieldset>
          <legend>Report (abstraction)</legend>
          {REPORT_FACTORIES.map((f, i) => (
            <label key={f.name} style={{ display: "block" }}>
              <input type="radio" name="report" checked={reportIndex === i} onChange={() => setReportIndex(i)} />{" "}
              {f.name}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Renderer (implementation)</legend>
          {RENDERERS.map((r, i) => (
            <label key={r.name} style={{ display: "block" }}>
              <input
                type="radio"
                name="renderer"
                checked={rendererIndex === i}
                onChange={() => setRendererIndex(i)}
              />{" "}
              {r.name}
            </label>
          ))}
        </fieldset>
      </div>
      <p>
        {REPORT_FACTORIES.length} reports × {RENDERERS.length} renderers = {REPORT_FACTORIES.length * RENDERERS.length}{" "}
        combinations, built from {REPORT_FACTORIES.length + RENDERERS.length} classes.
      </p>
      <pre style={{ background: "#f4f4f4", padding: 8 }}>{report.render().join("\n")}</pre>
    </section>
  );
}
