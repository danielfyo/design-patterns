// Bridge pattern: reports (abstraction) x renderers (implementation), varying independently.
//
// Run with: go run ./patterns/structural/bridge/go
package main

import "fmt"

// Report is the Abstraction as seen by clients.
type Report interface {
	Name() string
	SetRenderer(r Renderer)
	Render() []string
}

// row is one label/value pair produced by a report.
type row struct{ label, value string }

// reportBase holds the bridge (the Renderer reference) and the shared rendering
// algorithm. Concrete reports embed it, so they inherit SetRenderer and render.
type reportBase struct {
	renderer Renderer
}

func (b *reportBase) SetRenderer(r Renderer) { b.renderer = r }

// render is the high-level operation built only from the implementor's primitives.
func (b *reportBase) render(title string, rows []row, footer row) []string {
	lines := []string{b.renderer.RenderTitle(title)}
	for _, r := range rows {
		lines = append(lines, b.renderer.RenderRow(r.label, r.value))
	}
	return append(lines, b.renderer.RenderFooter(footer.label, footer.value))
}

// Sale is one region's revenue, in cents to avoid floating point rounding.
type Sale struct {
	Region      string
	AmountCents int64
}

// SalesReport is a Refined Abstraction: revenue per region with a grand total.
type SalesReport struct {
	reportBase
	Sales []Sale
}

func money(cents int64) string { return fmt.Sprintf("%d.%02d", cents/100, cents%100) }

func (*SalesReport) Name() string { return "Sales report" }
func (s *SalesReport) Render() []string {
	var rows []row
	var total int64
	for _, sale := range s.Sales {
		rows = append(rows, row{sale.Region, money(sale.AmountCents)})
		total += sale.AmountCents
	}
	return s.render("Sales by region", rows, row{"Total", money(total)})
}

// StockItem is the number of units in stock for one product.
type StockItem struct {
	Product string
	Units   int
}

// InventoryReport is a Refined Abstraction: stock levels per product.
type InventoryReport struct {
	reportBase
	Stock []StockItem
}

func (*InventoryReport) Name() string { return "Inventory report" }
func (r *InventoryReport) Render() []string {
	var rows []row
	total := 0
	for _, item := range r.Stock {
		rows = append(rows, row{item.Product, fmt.Sprintf("%d units", item.Units)})
		total += item.Units
	}
	return r.render("Inventory status", rows, row{"Total units", fmt.Sprint(total)})
}

func main() {
	fmt.Println("=== Bridge Pattern: Reports x renderers ===")

	renderers := []Renderer{MarkdownRenderer{}, HtmlRenderer{}, CsvRenderer{}}

	reports := []Report{
		&SalesReport{
			reportBase: reportBase{renderer: renderers[0]},
			Sales:      []Sale{{"North", 1250000}, {"South", 830050}, {"West", 1019950}},
		},
		&InventoryReport{
			reportBase: reportBase{renderer: renderers[0]},
			Stock:      []StockItem{{"Keyboards", 42}, {"Monitors", 7}},
		},
	}

	// Every report works with every renderer: the two hierarchies vary independently.
	for _, report := range reports {
		for _, renderer := range renderers {
			report.SetRenderer(renderer)
			fmt.Printf("--- %s as %s ---\n", report.Name(), renderer.Name())
			for _, line := range report.Render() {
				fmt.Println(line)
			}
		}
	}

	combos := len(reports) * len(renderers)
	fmt.Printf("%d reports x %d renderers = %d combinations from %d classes (inheritance alone would need %d)\n",
		len(reports), len(renderers), combos, len(reports)+len(renderers), combos)
}
