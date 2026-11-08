/**
 * Template Method pattern: a data importer whose skeleton is fixed while
 * subclasses fill in the format-specific steps.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (TemplateMethodDemo.tsx).
 */

export type Logger = (line: string) => void;

/** One product row, whatever the source format. */
export interface Product {
  readonly sku: string;
  readonly name: string;
  readonly price: number;
}

/** What the template reports to the onComplete hook. */
export interface ImportSummary {
  readonly read: number;
  readonly dropped: number;
  readonly saved: number;
  readonly total: number;
}

export const money = (amount: number): string => `$${amount.toFixed(2)}`;

/**
 * Abstract Class: `import()` is the template method. It fixes the order of the
 * steps; subclasses implement `parse()` and may override the hooks.
 */
export abstract class DataImporter {
  constructor(protected readonly log: Logger = console.log) {}

  /** The template method. (TypeScript has no `final`; by convention, do not override it.) */
  import(raw: string): ImportSummary {
    const records = this.parse(raw);
    this.log(`[parse] ${records.length} record(s) read`);
    const valid = this.validate(records);
    const transformed = valid.map((r) => this.transform(r));
    this.save(transformed);
    const summary: ImportSummary = {
      read: records.length,
      dropped: records.length - valid.length,
      saved: transformed.length,
      total: transformed.reduce((sum, p) => sum + p.price, 0),
    };
    this.onComplete(summary);
    return summary;
  }

  /** Primitive operation: every format parses differently, so it is abstract. */
  protected abstract parse(raw: string): Product[];

  /** Overridable step with a sensible default: drop incomplete or wrong rows. */
  protected validate(records: Product[]): Product[] {
    return records.filter((r) => {
      if (r.name.trim() === "") {
        this.log(`[validate] dropped ${r.sku}: empty name`);
        return false;
      }
      if (r.price < 0) {
        this.log(`[validate] dropped ${r.sku}: negative price ${r.price.toFixed(2)}`);
        return false;
      }
      return true;
    });
  }

  /** Hook: identity by default. */
  protected transform(record: Product): Product {
    return record;
  }

  /** Common step shared by every importer (private: subclasses cannot change it). */
  private save(records: Product[]): void {
    for (const p of records) {
      this.log(`[save] ${p.sku.padEnd(7)} ${p.name.padEnd(16)} ${money(p.price)}`);
    }
  }

  /** Hook: called at the end with the summary; subclasses may extend it. */
  protected onComplete(s: ImportSummary): void {
    this.log(`[complete] ${s.read} read, ${s.dropped} dropped, ${s.saved} saved, total ${money(s.total)}`);
  }
}

/** Concrete Class: parses "sku,name,price" lines and extends the completion hook. */
export class CsvImporter extends DataImporter {
  protected override parse(raw: string): Product[] {
    return raw
      .trim()
      .split("\n")
      .slice(1) // header
      .map((line) => line.trim().split(","))
      .map(([sku = "", name = "", price = "0"]) => ({ sku, name, price: Number(price) }));
  }

  protected override onComplete(summary: ImportSummary): void {
    super.onComplete(summary);
    this.log("[notify] import report sent to the catalog team");
  }
}

/** Concrete Class: parses a JSON array and overrides the transform hook. */
export class JsonImporter extends DataImporter {
  protected override parse(raw: string): Product[] {
    return JSON.parse(raw) as Product[];
  }

  protected override transform(record: Product): Product {
    const sku = record.sku.toUpperCase();
    this.log(`[transform] ${record.sku} -> ${sku}`);
    return { ...record, sku };
  }
}

export const CSV_SAMPLE = `sku,name,price
bk-001,Clean Code,32.50
bk-002,,18.00
bk-003,Refactoring,-5.00
bk-004,Design Patterns,45.00`;

export const JSON_SAMPLE = `[
  {"sku": "el-100", "name": "USB-C cable", "price": 9.99},
  {"sku": "el-200", "name": "Headphones", "price": 59.90},
  {"sku": "el-300", "name": "", "price": 12.00}
]`;
