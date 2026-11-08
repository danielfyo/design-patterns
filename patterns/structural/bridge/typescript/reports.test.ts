import { describe, expect, it } from "vitest";
import {
  CsvRenderer,
  HtmlRenderer,
  InventoryReport,
  MarkdownRenderer,
  Report,
  SalesReport,
  type Renderer,
  type Row,
  type Sale,
  type StockItem,
} from "./reports.ts";

const sales: Sale[] = [
  { region: "North", amount: 12500 },
  { region: "South", amount: 8300.5 },
  { region: "West", amount: 10199.5 },
];
const stock: StockItem[] = [
  { product: "Keyboards", units: 42 },
  { product: "Monitors", units: 7 },
];

/** A new Concrete Implementor written without touching any report. */
class PlainTextRenderer implements Renderer {
  readonly name = "Plain text";
  renderTitle(title: string): string {
    return title.toUpperCase();
  }
  renderRow(label: string, value: string): string {
    return `${label} = ${value}`;
  }
  renderFooter(label: string, value: string): string {
    return `== ${label} = ${value}`;
  }
}

/** A new Refined Abstraction written without touching any renderer. */
class HeadcountReport extends Report {
  readonly name = "Headcount report";
  protected readonly title = "Headcount";
  protected override rows(): Row[] {
    return [
      ["Engineering", "12"],
      ["Sales", "5"],
    ];
  }
  protected override footer(): Row {
    return ["Total", "17"];
  }
}

describe("Bridge: reports x renderers", () => {
  it("renders the sales report with its grand total through Markdown", () => {
    expect(new SalesReport(new MarkdownRenderer(), sales).render()).toEqual([
      "# Sales by region",
      "- **North**: 12500.00",
      "- **South**: 8300.50",
      "- **West**: 10199.50",
      "**Total: 31000.00**",
    ]);
  });

  it("renders the inventory report with its total units through HTML", () => {
    expect(new InventoryReport(new HtmlRenderer(), stock).render()).toEqual([
      "<h1>Inventory status</h1>",
      "<p><strong>Keyboards:</strong> 42 units</p>",
      "<p><strong>Monitors:</strong> 7 units</p>",
      "<footer>Total units: 49</footer>",
    ]);
  });

  it("changes only the format when the renderer is swapped at runtime", () => {
    const report = new InventoryReport(new MarkdownRenderer(), stock);
    const markdown = report.render();

    report.renderer = new CsvRenderer();

    expect(report.render()).toEqual(["report,Inventory status", "Keyboards,42 units", "Monitors,7 units", "Total units,49"]);
    expect(report.render()).toHaveLength(markdown.length);
  });

  it.each([
    [new MarkdownRenderer(), "# Sales by region"],
    [new HtmlRenderer(), "<h1>Sales by region</h1>"],
    [new CsvRenderer(), "report,Sales by region"],
  ])("lets every renderer draw the same report (%#)", (renderer, title) => {
    const lines = new SalesReport(renderer, sales).render();

    expect(lines[0]).toBe(title);
    expect(lines).toHaveLength(5);
  });

  it("works with a new renderer without changing the reports", () => {
    const renderer = new PlainTextRenderer();

    expect(new SalesReport(renderer, sales).render()).toEqual([
      "SALES BY REGION",
      "North = 12500.00",
      "South = 8300.50",
      "West = 10199.50",
      "== Total = 31000.00",
    ]);
    expect(new InventoryReport(renderer, stock).render().at(-1)).toBe("== Total units = 49");
  });

  it("works with a new report without changing the renderers", () => {
    expect(new HeadcountReport(new CsvRenderer()).render()).toEqual([
      "report,Headcount",
      "Engineering,12",
      "Sales,5",
      "Total,17",
    ]);
  });

  it("still renders a title and a zero total for empty reports", () => {
    expect(new SalesReport(new CsvRenderer(), []).render()).toEqual(["report,Sales by region", "Total,0.00"]);
    expect(new InventoryReport(new CsvRenderer(), []).render()).toEqual(["report,Inventory status", "Total units,0"]);
  });
});
