package main

import (
	"bytes"
	"io"
	"os"
	"reflect"
	"testing"
)

func sampleCart() []CartItem {
	return []CartItem{
		&Book{Item{"Clean Code", 32.50, 0.80}},
		&Electronics{Item{"Headphones", 59.90, 0.40}},
		&Food{Item{"Coffee beans", 12.00, 1.50}},
		&Electronics{Item{"Monitor", 199.00, 5.50}},
		&Food{Item{"Chocolate", 3.50, 0.20}},
	}
}

// kindRecorder only records which Visit method each element called.
type kindRecorder struct{ visits []string }

func (k *kindRecorder) VisitBook(b *Book) { k.visits = append(k.visits, "book:"+b.Name) }
func (k *kindRecorder) VisitElectronics(e *Electronics) {
	k.visits = append(k.visits, "electronics:"+e.Name)
}
func (k *kindRecorder) VisitFood(f *Food) { k.visits = append(k.visits, "food:"+f.Name) }

func visitAll(v CartVisitor, items ...CartItem) {
	for _, it := range items {
		it.Accept(v)
	}
}

func TestEachElementDispatchesToTheVisitMethodOfItsOwnType(t *testing.T) {
	rec := &kindRecorder{}

	visitAll(rec, sampleCart()...)

	want := []string{"book:Clean Code", "electronics:Headphones", "food:Coffee beans", "electronics:Monitor", "food:Chocolate"}
	if !reflect.DeepEqual(rec.visits, want) {
		t.Errorf("visits = %v, want %v", rec.visits, want)
	}
}

func TestTaxRateDependsOnTheElementType(t *testing.T) {
	it := Item{"Item", 25, 1}
	tests := []struct {
		name string
		item CartItem
		want float64
	}{
		{"book", &Book{it}, 1.00},
		{"electronics", &Electronics{it}, 5.25},
		{"food", &Food{it}, 2.50},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tax := &TaxCalculator{}
			captureStdout(t, func() { tt.item.Accept(tax) })
			if tax.Total != tt.want {
				t.Errorf("Total = %v, want %v", tax.Total, tt.want)
			}
		})
	}
}

func TestTaxIsRoundedHalfUpPerItem(t *testing.T) {
	tax := &TaxCalculator{}

	captureStdout(t, func() {
		visitAll(tax, &Electronics{Item{"Headphones", 59.90, 0.40}}, &Food{Item{"Chocolate", 0.05, 0.1}})
	})

	if tax.Total != 12.59 {
		t.Errorf("Total = %v, want 12.59", tax.Total)
	}
}

func TestFoodShippingIsPerKgWithAMinimum(t *testing.T) {
	tests := []struct{ weight, want float64 }{{0.20, 3.00}, {1.50, 3.75}}
	for _, tt := range tests {
		shipping := &ShippingCostCalculator{}
		captureStdout(t, func() { visitAll(shipping, &Food{Item{"Food", 1, tt.weight}}) })
		if shipping.Total != tt.want {
			t.Errorf("weight %v: Total = %v, want %v", tt.weight, shipping.Total, tt.want)
		}
	}
}

func TestShippingUsesADifferentRuleForEachElementType(t *testing.T) {
	shipping := &ShippingCostCalculator{}

	captureStdout(t, func() { visitAll(shipping, &Book{Item{"B", 100, 9}}) })
	if shipping.Total != 1.50 {
		t.Fatalf("book: Total = %v, want 1.50", shipping.Total)
	}
	captureStdout(t, func() { visitAll(shipping, &Electronics{Item{"E", 100, 5.50}}) })

	if shipping.Total != 12.10 {
		t.Errorf("Total = %v, want 12.10", shipping.Total)
	}
}

func TestEachVisitorIsASeparateOperationOverTheSameCart(t *testing.T) {
	receipt, tax, shipping := &ReceiptPrinter{}, &TaxCalculator{}, &ShippingCostCalculator{}

	captureStdout(t, func() {
		for _, v := range []CartVisitor{receipt, tax, shipping} {
			visitAll(v, sampleCart()...)
		}
	})

	if receipt.Total != 306.90 || tax.Total != 57.22 || shipping.Total != 23.33 {
		t.Errorf("totals = %v / %v / %v, want 306.90 / 57.22 / 23.33", receipt.Total, tax.Total, shipping.Total)
	}
}

func TestReceiptPrinterLabelsEachLineWithTheElementType(t *testing.T) {
	got := captureStdout(t, func() {
		visitAll(&ReceiptPrinter{}, &Book{Item{"Clean Code", 32.50, 0.80}}, &Food{Item{"Chocolate", 3.50, 0.20}})
	})

	want := "  [Book]        Clean Code       $32.50  0.80kg\n" +
		"  [Food]        Chocolate         $3.50  0.20kg\n"
	if got != want {
		t.Errorf("output = %q, want %q", got, want)
	}
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
