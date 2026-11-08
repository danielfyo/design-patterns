import { describe, expect, it } from "vitest";
import {
  CSV_SAMPLE,
  CsvImporter,
  DataImporter,
  JSON_SAMPLE,
  JsonImporter,
  money,
  type ImportSummary,
  type Product,
} from "./importers.ts";

/** A test subclass that records the order in which the template calls each step. */
class RecordingImporter extends DataImporter {
  readonly calls: string[] = [];

  constructor(private readonly products: Product[]) {
    super(() => {});
  }

  protected override parse(): Product[] {
    this.calls.push("parse");
    return this.products;
  }

  protected override validate(records: Product[]): Product[] {
    this.calls.push("validate");
    return super.validate(records);
  }

  protected override transform(record: Product): Product {
    this.calls.push(`transform ${record.sku}`);
    return record;
  }

  protected override onComplete(): void {
    this.calls.push("complete");
  }
}

function capture(): { lines: string[]; log: (line: string) => void } {
  const lines: string[] = [];
  return { lines, log: (line) => lines.push(line) };
}

describe("Template Method: data importer", () => {
  it("calls the steps in a fixed order", () => {
    const importer = new RecordingImporter([
      { sku: "a", name: "A", price: 1 },
      { sku: "b", name: "B", price: 2 },
    ]);

    importer.import("ignored");

    expect(importer.calls).toEqual(["parse", "validate", "transform a", "transform b", "complete"]);
  });

  it("drops invalid CSV rows and summarises the rest", () => {
    const { lines, log } = capture();

    const summary = new CsvImporter(log).import(CSV_SAMPLE);

    expect(summary).toEqual<ImportSummary>({ read: 4, dropped: 2, saved: 2, total: 77.5 });
    expect(lines).toContain("[validate] dropped bk-002: empty name");
    expect(lines).toContain("[validate] dropped bk-003: negative price -5.00");
  });

  it("extends the completion hook after the default in the CSV importer", () => {
    const { lines, log } = capture();

    new CsvImporter(log).import(CSV_SAMPLE);

    expect(lines.at(-2)).toMatch(/^\[complete\] /);
    expect(lines.at(-1)).toBe("[notify] import report sent to the catalog team");
  });

  it("overrides the transform hook in the JSON importer", () => {
    const { lines, log } = capture();

    const summary = new JsonImporter(log).import(JSON_SAMPLE);

    expect(summary).toMatchObject({ read: 3, dropped: 1, saved: 2 });
    expect(money(summary.total)).toBe("$69.89");
    expect(lines).toContain("[transform] el-100 -> EL-100");
    expect(lines.some((l) => l.startsWith("[save] EL-200 "))).toBe(true);
    expect(lines.some((l) => l.startsWith("[notify]"))).toBe(false);
  });

  it("treats a whitespace-only name as empty in the default validation", () => {
    const importer = new RecordingImporter([
      { sku: "x", name: "   ", price: 1 },
      { sku: "y", name: "Y", price: 0 },
    ]);

    expect(importer.import("ignored")).toEqual<ImportSummary>({ read: 2, dropped: 1, saved: 1, total: 0 });
  });

  it("yields an empty summary when there is nothing to import", () => {
    const { lines, log } = capture();

    const summary = new CsvImporter(log).import("sku,name,price");

    expect(summary).toEqual<ImportSummary>({ read: 0, dropped: 0, saved: 0, total: 0 });
    expect(lines.slice(0, 2)).toEqual(["[parse] 0 record(s) read", expect.stringMatching(/^\[complete\] 0 read/)]);
  });
});
