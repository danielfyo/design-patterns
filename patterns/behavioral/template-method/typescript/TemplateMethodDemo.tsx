import { useState } from "react";
import { CSV_SAMPLE, CsvImporter, JSON_SAMPLE, JsonImporter, type DataImporter, type Logger } from "./importers.ts";

type Format = "csv" | "json";

const SAMPLES: Record<Format, string> = { csv: CSV_SAMPLE, json: JSON_SAMPLE };
const FACTORIES: Record<Format, (log: Logger) => DataImporter> = {
  csv: (log) => new CsvImporter(log),
  json: (log) => new JsonImporter(log),
};

/**
 * React usage: the component always calls the same template method,
 * `importer.import(raw)`. Only the concrete subclass changes. (In React code
 * the same idea often appears as a component with "slot" props or a custom
 * hook that accepts the varying steps as functions.)
 */
export default function TemplateMethodDemo() {
  const [format, setFormat] = useState<Format>("csv");
  const [raw, setRaw] = useState(CSV_SAMPLE);
  const [log, setLog] = useState<string[]>([]);

  const choose = (next: Format) => {
    setFormat(next);
    setRaw(SAMPLES[next]);
    setLog([]);
  };

  const run = () => {
    const lines: string[] = [];
    try {
      FACTORIES[format]((line) => lines.push(line)).import(raw);
    } catch (error) {
      lines.push(`[error] ${error instanceof Error ? error.message : String(error)}`);
    }
    setLog(lines);
  };

  return (
    <section>
      <h2>Template Method — Data importer</h2>
      <label>
        Importer{" "}
        <select value={format} onChange={(e) => choose(e.target.value as Format)}>
          <option value="csv">CsvImporter</option>
          <option value="json">JsonImporter</option>
        </select>
      </label>{" "}
      <button onClick={run}>import(raw)</button>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={7}
        style={{ display: "block", width: "100%", fontFamily: "monospace", marginTop: 8 }}
      />
      <pre style={{ background: "#f4f4f4", padding: 8 }}>{log.join("\n") || "Press import(raw) to run the template."}</pre>
    </section>
  );
}
