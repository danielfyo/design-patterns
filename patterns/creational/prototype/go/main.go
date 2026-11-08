// Prototype pattern: document templates that are cloned (deeply) instead of
// being built from scratch.
//
// Run with: go run ./patterns/creational/prototype/go
package main

import (
	"fmt"
	"maps"
	"reflect"
	"slices"
	"strings"
)

// Style is the nested, mutable part of a document. Document holds it by
// pointer, so a plain struct copy of a Document would share it.
type Style struct {
	Font   string
	SizePt int
}

// Document is the Prototype: it knows how to copy itself. Clone performs a DEEP
// copy; in Go that means explicitly copying every slice, map and pointer, since
// assigning a struct only copies their headers.
type Document struct {
	Title    string
	Sections []string
	Metadata map[string]string
	Style    *Style
}

// Clone returns a deep copy that shares no mutable state with d.
func (d *Document) Clone() *Document {
	style := *d.Style // copies the Style value (it only holds a string and an int)
	return &Document{
		Title:    d.Title,
		Sections: slices.Clone(d.Sections),
		Metadata: maps.Clone(d.Metadata),
		Style:    &style,
	}
}

// ShallowCopy is for comparison only: dereferencing copies the struct, but the
// slice, map and pointer inside still refer to the same underlying data.
func (d *Document) ShallowCopy() *Document {
	c := *d
	return &c
}

func (d *Document) String() string {
	pairs := make([]string, 0, len(d.Metadata))
	for _, k := range slices.Sorted(maps.Keys(d.Metadata)) {
		pairs = append(pairs, k+"="+d.Metadata[k])
	}
	return fmt.Sprintf("%s | %s %dpt | sections=[%s] | metadata={%s}",
		d.Title, d.Style.Font, d.Style.SizePt, strings.Join(d.Sections, ", "), strings.Join(pairs, ", "))
}

// TemplateRegistry stores named, pre-configured prototypes and hands out clones.
type TemplateRegistry struct {
	prototypes map[string]*Document
}

func NewTemplateRegistry() *TemplateRegistry {
	return &TemplateRegistry{prototypes: map[string]*Document{}}
}

// Names returns the registered template names, sorted.
func (r *TemplateRegistry) Names() []string { return slices.Sorted(maps.Keys(r.prototypes)) }

// Register stores a private clone, so later changes to the caller's document
// do not affect the template.
func (r *TemplateRegistry) Register(name string, prototype *Document) {
	r.prototypes[name] = prototype.Clone()
}

// Create returns a fresh deep clone of the named template.
func (r *TemplateRegistry) Create(name string) (*Document, error) {
	p, ok := r.prototypes[name]
	if !ok {
		return nil, fmt.Errorf("no template named %q", name)
	}
	return p.Clone(), nil
}

// sameData reports whether two slices or two maps share the same underlying storage.
func sameData(a, b any) bool { return reflect.ValueOf(a).Pointer() == reflect.ValueOf(b).Pointer() }

func main() {
	fmt.Println("=== Prototype Pattern: Document templates ===")

	registry := NewTemplateRegistry()
	registry.Register("invoice", &Document{
		Title:    "Invoice",
		Sections: []string{"Header", "Line items", "Totals"},
		Metadata: map[string]string{"owner": "billing", "status": "template"},
		Style:    &Style{Font: "Helvetica", SizePt: 10},
	})
	registry.Register("report", &Document{
		Title:    "Quarterly Report",
		Sections: []string{"Summary", "Findings", "Next steps"},
		Metadata: map[string]string{"owner": "analytics", "status": "template"},
		Style:    &Style{Font: "Times", SizePt: 12},
	})
	fmt.Printf("Registered templates: %s\n", strings.Join(registry.Names(), ", "))

	fmt.Println(`Clone "invoice" and fill it in:`)
	invoice, _ := registry.Create("invoice")
	invoice.Title = "Invoice #2026-001"
	invoice.Sections = append(invoice.Sections, "Notes")
	invoice.Metadata["client"] = "ACME Corp"
	invoice.Metadata["status"] = "draft"
	invoice.Style.Font = "Georgia"
	invoice.Style.SizePt = 11
	fmt.Printf("  %s\n", invoice)

	fmt.Println(`The "invoice" prototype is untouched:`)
	fresh, _ := registry.Create("invoice")
	fmt.Printf("  %s\n", fresh)

	report, _ := registry.Create("report")
	deep := report.Clone()
	fmt.Println("Deep clone shares nothing with its source:")
	fmt.Printf("  same sections: %t, same metadata: %t, same style: %t\n",
		sameData(deep.Sections, report.Sections), sameData(deep.Metadata, report.Metadata), deep.Style == report.Style)

	fmt.Println("Shallow copy (what NOT to do):")
	shallow := report.ShallowCopy()
	fmt.Printf("  same sections: %t, same metadata: %t, same style: %t\n",
		sameData(shallow.Sections, report.Sections), sameData(shallow.Metadata, report.Metadata), shallow.Style == report.Style)
	shallow.Title = "Draft"
	shallow.Sections[0] = "Cover page"
	shallow.Metadata["status"] = "edited"
	shallow.Style.Font = "Comic Sans"
	fmt.Printf("  copy:     %s\n", shallow)
	fmt.Printf("  original: %s\n", report)
	fmt.Println("  -> only the title stayed independent; every shared reference leaked")

	fmt.Println("Unknown template:")
	if _, err := registry.Create("memo"); err != nil {
		fmt.Println("  error:", err)
	}
}
