package main

import (
	"fmt"
	"strings"
)

// Product is one product row, whatever the source format.
type Product struct {
	SKU   string  `json:"sku"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

// ImportSummary is what the template reports to the completion hook.
type ImportSummary struct {
	Read, Dropped, Saved int
	Total                float64
}

// Parser is the required varying step (the "abstract" primitive operation).
// Go has no inheritance, so the steps that vary are expressed as an interface.
type Parser interface {
	Parse(raw string) ([]Product, error)
}

// Validator, Transformer and CompletionHook are optional hooks. The template
// checks for them with a type assertion, the same trick the standard library
// uses for io.WriterTo or http.Flusher.
type Validator interface {
	Validate(records []Product) []Product
}

type Transformer interface {
	Transform(record Product) Product
}

type CompletionHook interface {
	OnComplete(summary ImportSummary)
}

// Import is the template method: a plain function that fixes the order of the
// steps and calls into the varying ones. Nothing can override it.
func Import(steps Parser, raw string) (ImportSummary, error) {
	records, err := steps.Parse(raw)
	if err != nil {
		return ImportSummary{}, err
	}
	fmt.Printf("[parse] %d record(s) read\n", len(records))

	validate := DefaultValidate
	if v, ok := steps.(Validator); ok {
		validate = v.Validate
	}
	valid := validate(records)

	transformed := make([]Product, 0, len(valid))
	for _, r := range valid {
		if t, ok := steps.(Transformer); ok {
			r = t.Transform(r)
		}
		transformed = append(transformed, r)
	}

	save(transformed)

	summary := ImportSummary{Read: len(records), Dropped: len(records) - len(valid), Saved: len(transformed)}
	for _, p := range transformed {
		summary.Total += p.Price
	}
	if h, ok := steps.(CompletionHook); ok {
		h.OnComplete(summary)
	} else {
		DefaultOnComplete(summary)
	}
	return summary, nil
}

// DefaultValidate is the default validation step: drop incomplete or wrong rows.
func DefaultValidate(records []Product) []Product {
	var valid []Product
	for _, r := range records {
		switch {
		case strings.TrimSpace(r.Name) == "":
			fmt.Printf("[validate] dropped %s: empty name\n", r.SKU)
		case r.Price < 0:
			fmt.Printf("[validate] dropped %s: negative price %.2f\n", r.SKU, r.Price)
		default:
			valid = append(valid, r)
		}
	}
	return valid
}

// save is the common step shared by every importer (unexported: not replaceable).
func save(records []Product) {
	for _, p := range records {
		fmt.Printf("[save] %-7s %-16s $%.2f\n", p.SKU, p.Name, p.Price)
	}
}

// DefaultOnComplete is the default completion hook.
func DefaultOnComplete(s ImportSummary) {
	fmt.Printf("[complete] %d read, %d dropped, %d saved, total $%.2f\n", s.Read, s.Dropped, s.Saved, s.Total)
}
