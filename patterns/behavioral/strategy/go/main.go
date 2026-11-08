// Strategy pattern: interchangeable shipping cost algorithms.
//
// Run with: go run ./patterns/behavioral/strategy/go
package main

import "fmt"

// Order holds the data the strategies need. Money is stored in cents to avoid
// floating point rounding issues.
type Order struct {
	SubtotalCents int64
	WeightKg      float64
}

// ShippingStrategy is the Strategy interface. Go interfaces are satisfied
// implicitly: any type with these methods is a strategy.
type ShippingStrategy interface {
	Name() string
	Calculate(order Order) int64 // returns cents
}

// StandardShipping is a concrete strategy: flat fee plus a per-kilogram rate.
type StandardShipping struct{}

func (StandardShipping) Name() string { return "Standard" }
func (StandardShipping) Calculate(o Order) int64 {
	return 500 + int64(150*o.WeightKg)
}

// ExpressShipping is a concrete strategy: faster, so more expensive.
type ExpressShipping struct{}

func (ExpressShipping) Name() string { return "Express" }
func (ExpressShipping) Calculate(o Order) int64 {
	return 1500 + int64(300*o.WeightKg)
}

// FreeOverThresholdShipping composes another strategy: free above a threshold.
type FreeOverThresholdShipping struct {
	ThresholdCents int64
	Fallback       ShippingStrategy
}

func (f FreeOverThresholdShipping) Name() string {
	return fmt.Sprintf("Free over $%d", f.ThresholdCents/100)
}
func (f FreeOverThresholdShipping) Calculate(o Order) int64 {
	if o.SubtotalCents >= f.ThresholdCents {
		return 0
	}
	return f.Fallback.Calculate(o)
}

// StorePickup is a concrete strategy: the customer collects the parcel.
type StorePickup struct{}

func (StorePickup) Name() string          { return "Store pickup" }
func (StorePickup) Calculate(Order) int64 { return 0 }

// ShippingCalculator is the Context: it delegates to the current strategy.
type ShippingCalculator struct {
	Strategy ShippingStrategy
}

func (c *ShippingCalculator) Quote(o Order) int64 { return c.Strategy.Calculate(o) }

func money(cents int64) string { return fmt.Sprintf("$%d.%02d", cents/100, cents%100) }

func main() {
	fmt.Println("=== Strategy Pattern: Shipping cost calculator ===")

	strategies := []ShippingStrategy{
		StandardShipping{},
		ExpressShipping{},
		FreeOverThresholdShipping{ThresholdCents: 10000, Fallback: StandardShipping{}},
		StorePickup{},
	}
	orders := []Order{{SubtotalCents: 8000, WeightKg: 4}, {SubtotalCents: 15000, WeightKg: 4}}

	// The same calculator is reused; only the strategy changes at runtime.
	calculator := &ShippingCalculator{Strategy: strategies[0]}

	for _, order := range orders {
		fmt.Printf("Order: subtotal=%s, weight=%.1fkg\n", money(order.SubtotalCents), order.WeightKg)
		for _, s := range strategies {
			calculator.Strategy = s
			fmt.Printf("  %-16s -> %s\n", s.Name(), money(calculator.Quote(order)))
		}
	}
}
