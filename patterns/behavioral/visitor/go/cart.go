package main

import (
	"fmt"
	"math"
)

// CartItem is the Element: every item can accept a visitor. This is the first
// half of double dispatch — the call is resolved by the item's dynamic type.
type CartItem interface {
	Accept(v CartVisitor)
}

// Item holds the fields shared by every element; concrete elements embed it.
type Item struct {
	Name     string
	Price    float64
	WeightKg float64
}

// Book is a concrete element.
type Book struct{ Item }

// Electronics is a concrete element.
type Electronics struct{ Item }

// Food is a concrete element.
type Food struct{ Item }

// Each concrete element calls the visitor method that matches its own type.
func (b *Book) Accept(v CartVisitor)        { v.VisitBook(b) }
func (e *Electronics) Accept(v CartVisitor) { v.VisitElectronics(e) }
func (f *Food) Accept(v CartVisitor)        { v.VisitFood(f) }

// CartVisitor is the Visitor: one method per element type. This is the second
// half of double dispatch — the call is resolved by the visitor's dynamic type.
type CartVisitor interface {
	VisitBook(b *Book)
	VisitElectronics(e *Electronics)
	VisitFood(f *Food)
}

func round2(x float64) float64 { return math.Round(x*100) / 100 }
func money(x float64) string   { return fmt.Sprintf("$%.2f", x) }

// ReceiptPrinter is a concrete visitor: one receipt line per item plus a subtotal.
type ReceiptPrinter struct{ Total float64 }

func (r *ReceiptPrinter) VisitBook(b *Book)               { r.print("[Book]", b.Item) }
func (r *ReceiptPrinter) VisitElectronics(e *Electronics) { r.print("[Electronics]", e.Item) }
func (r *ReceiptPrinter) VisitFood(f *Food)               { r.print("[Food]", f.Item) }

func (r *ReceiptPrinter) print(label string, it Item) {
	fmt.Printf("  %-13s %-14s %8s  %.2fkg\n", label, it.Name, money(it.Price), it.WeightKg)
	r.Total = round2(r.Total + it.Price)
}

// TaxCalculator is a concrete visitor: VAT depends on the kind of product.
type TaxCalculator struct{ Total float64 }

func (t *TaxCalculator) VisitBook(b *Book) { t.apply(b.Item, "books 4%", 0.04) }
func (t *TaxCalculator) VisitElectronics(e *Electronics) {
	t.apply(e.Item, "electronics 21%", 0.21)
}
func (t *TaxCalculator) VisitFood(f *Food) { t.apply(f.Item, "food 10%", 0.10) }

func (t *TaxCalculator) apply(it Item, label string, rate float64) {
	tax := round2(it.Price * rate)
	fmt.Printf("  %-14s %-17s %8s\n", it.Name, label, money(tax))
	t.Total = round2(t.Total + tax)
}

// ShippingCostCalculator is a concrete visitor: rules by product type and weight.
type ShippingCostCalculator struct{ Total float64 }

func (s *ShippingCostCalculator) VisitBook(b *Book) { s.add(b.Item, "flat rate", 1.50) }
func (s *ShippingCostCalculator) VisitElectronics(e *Electronics) {
	s.add(e.Item, "$4.00 + $1.20/kg", 4.00+1.20*e.WeightKg)
}
func (s *ShippingCostCalculator) VisitFood(f *Food) {
	s.add(f.Item, "$2.50/kg, min $3.00", math.Max(3.00, 2.50*f.WeightKg))
}

func (s *ShippingCostCalculator) add(it Item, rule string, cost float64) {
	cost = round2(cost)
	fmt.Printf("  %-14s %-20s %8s\n", it.Name, rule, money(cost))
	s.Total = round2(s.Total + cost)
}
