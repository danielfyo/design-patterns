package main

import (
	"bytes"
	"io"
	"os"
	"slices"
	"strings"
	"testing"
)

var (
	sales = []Sale{{"North", 1250000}, {"South", 830050}, {"West", 1019950}}
	stock = []StockItem{{"Keyboards", 42}, {"Monitors", 7}}
)

// plainTextRenderer is a new Concrete Implementor written without touching any report.
type plainTextRenderer struct{}

func (plainTextRenderer) Name() string                    { return "Plain text" }
func (plainTextRenderer) RenderTitle(t string) string     { return strings.ToUpper(t) }
func (plainTextRenderer) RenderRow(l, v string) string    { return l + " = " + v }
func (plainTextRenderer) RenderFooter(l, v string) string { return "== " + l + " = " + v }

// headcountReport is a new Refined Abstraction written without touching any renderer.
type headcountReport struct{ reportBase }

func (*headcountReport) Name() string { return "Headcount report" }
func (h *headcountReport) Render() []string {
	return h.render("Headcount", []row{{"Engineering", "12"}, {"Sales", "5"}}, row{"Total", "17"})
}

func newSalesReport(r Renderer, s []Sale) *SalesReport {
	return &SalesReport{reportBase: reportBase{renderer: r}, Sales: s}
}

func newInventoryReport(r Renderer, s []StockItem) *InventoryReport {
	return &InventoryReport{reportBase: reportBase{renderer: r}, Stock: s}
}

func assertLines(t *testing.T, got, want []string) {
	t.Helper()
	if !slices.Equal(got, want) {
		t.Errorf("Render() =\n%q\nwant\n%q", got, want)
	}
}

func TestSalesReportRendersRowsAndGrandTotalThroughMarkdown(t *testing.T) {
	assertLines(t, newSalesReport(MarkdownRenderer{}, sales).Render(), []string{
		"# Sales by region",
		"- **North**: 12500.00",
		"- **South**: 8300.50",
		"- **West**: 10199.50",
		"**Total: 31000.00**",
	})
}

func TestInventoryReportRendersUnitsAndTotalThroughHtml(t *testing.T) {
	assertLines(t, newInventoryReport(HtmlRenderer{}, stock).Render(), []string{
		"<h1>Inventory status</h1>",
		"<p><strong>Keyboards:</strong> 42 units</p>",
		"<p><strong>Monitors:</strong> 7 units</p>",
		"<footer>Total units: 49</footer>",
	})
}

func TestSwappingTheRendererAtRuntimeChangesOnlyTheFormat(t *testing.T) {
	var report Report = newInventoryReport(MarkdownRenderer{}, stock)
	markdown := report.Render()

	report.SetRenderer(CsvRenderer{})

	csv := report.Render()
	assertLines(t, csv, []string{"report,Inventory status", "Keyboards,42 units", "Monitors,7 units", "Total units,49"})
	if len(csv) != len(markdown) {
		t.Errorf("line count changed from %d to %d", len(markdown), len(csv))
	}
}

func TestEveryRendererWorksWithTheSameReport(t *testing.T) {
	tests := []struct {
		renderer Renderer
		title    string
	}{
		{MarkdownRenderer{}, "# Sales by region"},
		{HtmlRenderer{}, "<h1>Sales by region</h1>"},
		{CsvRenderer{}, "report,Sales by region"},
	}
	for _, tt := range tests {
		t.Run(tt.renderer.Name(), func(t *testing.T) {
			lines := newSalesReport(tt.renderer, sales).Render()
			if len(lines) != 5 || lines[0] != tt.title {
				t.Errorf("Render() = %q, want 5 lines starting with %q", lines, tt.title)
			}
		})
	}
}

func TestANewRendererWorksWithExistingReportsUnchanged(t *testing.T) {
	renderer := plainTextRenderer{}

	assertLines(t, newSalesReport(renderer, sales).Render(), []string{
		"SALES BY REGION",
		"North = 12500.00",
		"South = 8300.50",
		"West = 10199.50",
		"== Total = 31000.00",
	})
	lines := newInventoryReport(renderer, stock).Render()
	if got := lines[len(lines)-1]; got != "== Total units = 49" {
		t.Errorf("footer = %q", got)
	}
}

func TestANewReportWorksWithExistingRenderersUnchanged(t *testing.T) {
	var report Report = &headcountReport{reportBase{renderer: CsvRenderer{}}}

	assertLines(t, report.Render(), []string{"report,Headcount", "Engineering,12", "Sales,5", "Total,17"})
}

func TestEmptyReportsStillRenderATitleAndAZeroTotal(t *testing.T) {
	assertLines(t, newSalesReport(CsvRenderer{}, nil).Render(), []string{"report,Sales by region", "Total,0.00"})
	assertLines(t, newInventoryReport(CsvRenderer{}, nil).Render(), []string{"report,Inventory status", "Total units,0"})
}

func TestDemoPrintsTheExpectedOutput(t *testing.T) {
	want, err := os.ReadFile("../expected_output.txt")
	if err != nil {
		t.Fatal(err)
	}
	if got := captureStdout(t, main); got != string(want) {
		t.Errorf("output mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

// captureStdout runs fn and returns everything it printed to os.Stdout.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	original := os.Stdout
	os.Stdout = w
	defer func() { os.Stdout = original }()

	fn()
	_ = w.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}
