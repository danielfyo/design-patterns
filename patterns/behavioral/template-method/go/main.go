// Template Method pattern: a data importer with a fixed skeleton.
//
// Run with: go run ./patterns/behavioral/template-method/go
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// CsvImporter is a concrete set of steps: it parses "sku,name,price" lines and
// extends the completion hook.
type CsvImporter struct{}

func (CsvImporter) Parse(raw string) ([]Product, error) {
	lines := strings.Split(strings.TrimSpace(raw), "\n")[1:] // skip the header
	products := make([]Product, 0, len(lines))
	for _, line := range lines {
		f := strings.Split(strings.TrimSpace(line), ",")
		if len(f) != 3 {
			return nil, fmt.Errorf("bad CSV line %q", line)
		}
		price, err := strconv.ParseFloat(f[2], 64)
		if err != nil {
			return nil, err
		}
		products = append(products, Product{SKU: f[0], Name: f[1], Price: price})
	}
	return products, nil
}

func (CsvImporter) OnComplete(s ImportSummary) {
	DefaultOnComplete(s) // "super" call: reuse the default, then extend it
	fmt.Println("[notify] import report sent to the catalog team")
}

// JsonImporter is a concrete set of steps: it parses a JSON array and
// overrides the transform hook.
type JsonImporter struct{}

func (JsonImporter) Parse(raw string) ([]Product, error) {
	var products []Product
	err := json.Unmarshal([]byte(raw), &products)
	return products, err
}

func (JsonImporter) Transform(p Product) Product {
	upper := strings.ToUpper(p.SKU)
	fmt.Printf("[transform] %s -> %s\n", p.SKU, upper)
	p.SKU = upper
	return p
}

const csvSample = `
sku,name,price
bk-001,Clean Code,32.50
bk-002,,18.00
bk-003,Refactoring,-5.00
bk-004,Design Patterns,45.00
`

const jsonSample = `[
  {"sku": "el-100", "name": "USB-C cable", "price": 9.99},
  {"sku": "el-200", "name": "Headphones", "price": 59.90},
  {"sku": "el-300", "name": "", "price": 12.00}
]`

func main() {
	fmt.Println("=== Template Method Pattern: Data importer ===")

	// The client calls the same template; each importer supplies different steps.
	fmt.Println("--- CsvImporter ---")
	if _, err := Import(CsvImporter{}, csvSample); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	fmt.Println("--- JsonImporter ---")
	if _, err := Import(JsonImporter{}, jsonSample); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
