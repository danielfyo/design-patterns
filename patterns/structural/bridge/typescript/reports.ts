/**
 * Bridge pattern: reports (abstraction) x renderers (implementation), varying independently.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (BridgeDemo.tsx).
 */

/** Implementor: the low-level operations every output format must provide. */
export interface Renderer {
  readonly name: string;
  renderTitle(title: string): string;
  renderRow(label: string, value: string): string;
  renderFooter(label: string, value: string): string;
}

/** Concrete Implementor: Markdown output. */
export class MarkdownRenderer implements Renderer {
  readonly name = "Markdown";
  renderTitle(title: string): string {
    return `# ${title}`;
  }
  renderRow(label: string, value: string): string {
    return `- **${label}**: ${value}`;
  }
  renderFooter(label: string, value: string): string {
    return `**${label}: ${value}**`;
  }
}

/** Concrete Implementor: HTML output. */
export class HtmlRenderer implements Renderer {
  readonly name = "HTML";
  renderTitle(title: string): string {
    return `<h1>${title}</h1>`;
  }
  renderRow(label: string, value: string): string {
    return `<p><strong>${label}:</strong> ${value}</p>`;
  }
  renderFooter(label: string, value: string): string {
    return `<footer>${label}: ${value}</footer>`;
  }
}

/** Concrete Implementor: CSV output (one label,value pair per line). */
export class CsvRenderer implements Renderer {
  readonly name = "CSV";
  renderTitle(title: string): string {
    return `report,${title}`;
  }
  renderRow(label: string, value: string): string {
    return `${label},${value}`;
  }
  renderFooter(label: string, value: string): string {
    return `${label},${value}`;
  }
}

export type Row = readonly [label: string, value: string];

/**
 * Abstraction: a report knows WHAT to show and delegates HOW to draw it to the
 * renderer it holds. That reference is the bridge between the two hierarchies.
 */
export abstract class Report {
  constructor(public renderer: Renderer) {}

  abstract readonly name: string;
  protected abstract readonly title: string;
  protected abstract rows(): Row[];
  protected abstract footer(): Row;

  /** High-level operation built only from the implementor's primitives. */
  render(): string[] {
    const [footerLabel, footerValue] = this.footer();
    return [
      this.renderer.renderTitle(this.title),
      ...this.rows().map(([label, value]) => this.renderer.renderRow(label, value)),
      this.renderer.renderFooter(footerLabel, footerValue),
    ];
  }
}

export interface Sale {
  readonly region: string;
  readonly amount: number;
}

/** Refined Abstraction: revenue per region with a grand total. */
export class SalesReport extends Report {
  readonly name = "Sales report";
  protected readonly title = "Sales by region";

  constructor(
    renderer: Renderer,
    private readonly sales: readonly Sale[],
  ) {
    super(renderer);
  }

  protected override rows(): Row[] {
    return this.sales.map((s) => [s.region, s.amount.toFixed(2)]);
  }

  protected override footer(): Row {
    return ["Total", this.sales.reduce((sum, s) => sum + s.amount, 0).toFixed(2)];
  }
}

export interface StockItem {
  readonly product: string;
  readonly units: number;
}

/** Refined Abstraction: stock levels per product. */
export class InventoryReport extends Report {
  readonly name = "Inventory report";
  protected readonly title = "Inventory status";

  constructor(
    renderer: Renderer,
    private readonly stock: readonly StockItem[],
  ) {
    super(renderer);
  }

  protected override rows(): Row[] {
    return this.stock.map((s) => [s.product, `${s.units} units`]);
  }

  protected override footer(): Row {
    return ["Total units", String(this.stock.reduce((sum, s) => sum + s.units, 0))];
  }
}
