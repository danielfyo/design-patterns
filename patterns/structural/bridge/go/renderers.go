package main

import "fmt"

// Renderer is the Implementor: the low-level operations every output format
// must provide. Reports are written only in terms of these primitives.
type Renderer interface {
	Name() string
	RenderTitle(title string) string
	RenderRow(label, value string) string
	RenderFooter(label, value string) string
}

// MarkdownRenderer is a Concrete Implementor: Markdown output.
type MarkdownRenderer struct{}

func (MarkdownRenderer) Name() string                { return "Markdown" }
func (MarkdownRenderer) RenderTitle(t string) string { return "# " + t }
func (MarkdownRenderer) RenderRow(label, value string) string {
	return fmt.Sprintf("- **%s**: %s", label, value)
}
func (MarkdownRenderer) RenderFooter(label, value string) string {
	return fmt.Sprintf("**%s: %s**", label, value)
}

// HtmlRenderer is a Concrete Implementor: HTML output.
type HtmlRenderer struct{}

func (HtmlRenderer) Name() string                { return "HTML" }
func (HtmlRenderer) RenderTitle(t string) string { return "<h1>" + t + "</h1>" }
func (HtmlRenderer) RenderRow(label, value string) string {
	return fmt.Sprintf("<p><strong>%s:</strong> %s</p>", label, value)
}
func (HtmlRenderer) RenderFooter(label, value string) string {
	return fmt.Sprintf("<footer>%s: %s</footer>", label, value)
}

// CsvRenderer is a Concrete Implementor: CSV output (one label,value pair per line).
type CsvRenderer struct{}

func (CsvRenderer) Name() string                            { return "CSV" }
func (CsvRenderer) RenderTitle(t string) string             { return "report," + t }
func (CsvRenderer) RenderRow(label, value string) string    { return label + "," + value }
func (CsvRenderer) RenderFooter(label, value string) string { return label + "," + value }
