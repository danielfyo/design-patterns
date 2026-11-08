// Visitor pattern: tax, shipping and receipt operations over cart items.
//
// Run with: go run ./patterns/behavioral/visitor/go
package main

import "fmt"

func main() {
	fmt.Println("=== Visitor Pattern: Shopping cart: tax & shipping ===")

	cart := []CartItem{
		&Book{Item{"Clean Code", 32.50, 0.80}},
		&Electronics{Item{"Headphones", 59.90, 0.40}},
		&Food{Item{"Coffee beans", 12.00, 1.50}},
		&Electronics{Item{"Monitor", 199.00, 5.50}},
		&Food{Item{"Chocolate", 3.50, 0.20}},
	}

	// The traversal is always the same; each visitor is a different operation.
	visit := func(v CartVisitor) {
		for _, item := range cart {
			item.Accept(v)
		}
	}

	fmt.Println("--- ReceiptPrinter ---")
	receipt := &ReceiptPrinter{}
	visit(receipt)
	fmt.Printf("  Subtotal: %s\n", money(receipt.Total))

	fmt.Println("--- TaxCalculator ---")
	tax := &TaxCalculator{}
	visit(tax)
	fmt.Printf("  Total tax: %s\n", money(tax.Total))

	fmt.Println("--- ShippingCostCalculator ---")
	shipping := &ShippingCostCalculator{}
	visit(shipping)
	fmt.Printf("  Total shipping: %s\n", money(shipping.Total))

	grand := round2(receipt.Total + tax.Total + shipping.Total)
	fmt.Printf("Grand total: %s + %s tax + %s shipping = %s\n",
		money(receipt.Total), money(tax.Total), money(shipping.Total), money(grand))
}
