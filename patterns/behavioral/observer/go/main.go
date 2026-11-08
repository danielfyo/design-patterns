// Observer pattern: a stock ticker notifies its subscribers of price changes.
//
// Run with: go run ./patterns/behavioral/observer/go
package main

import (
	"fmt"
	"slices"
)

// StockObserver is the Observer interface: anything that wants to hear about
// price changes. Prices are in cents to avoid floating point rounding.
type StockObserver interface {
	Update(symbol string, priceCents int64)
}

// StockTicker is the Subject: it keeps the latest prices and a list of
// observers, and notifies all of them whenever a price changes.
type StockTicker struct {
	observers []StockObserver
	prices    map[string]int64
}

// NewStockTicker returns a ticker with no observers.
func NewStockTicker() *StockTicker {
	return &StockTicker{prices: map[string]int64{}}
}

// Subscribe registers an observer and returns a function that unsubscribes it.
func (t *StockTicker) Subscribe(o StockObserver) (unsubscribe func()) {
	t.observers = append(t.observers, o)
	return func() { t.Unsubscribe(o) }
}

// Unsubscribe removes an observer (compared by identity: use pointers).
func (t *StockTicker) Unsubscribe(o StockObserver) {
	if i := slices.Index(t.observers, o); i >= 0 {
		t.observers = slices.Delete(t.observers, i, i+1)
	}
}

// Price returns the latest price of a symbol, if known.
func (t *StockTicker) Price(symbol string) (int64, bool) {
	p, ok := t.prices[symbol]
	return p, ok
}

// SetPrice stores a new price and notifies every observer.
func (t *StockTicker) SetPrice(symbol string, priceCents int64) {
	t.prices[symbol] = priceCents
	fmt.Printf("[ticker] %s = %s (notifying %d observers)\n", symbol, money(priceCents), len(t.observers))
	t.notify(symbol, priceCents)
}

func (t *StockTicker) notify(symbol string, priceCents int64) {
	// Iterate over a copy so observers may unsubscribe while being notified.
	for _, o := range slices.Clone(t.observers) {
		o.Update(symbol, priceCents)
	}
}

// PriceDisplay is a Concrete Observer: it shows every price it receives.
type PriceDisplay struct{}

func (*PriceDisplay) Update(symbol string, priceCents int64) {
	fmt.Printf("  [display] %s: %s\n", symbol, money(priceCents))
}

// PriceAlert is a Concrete Observer: it reacts only when one symbol goes above
// a threshold.
type PriceAlert struct {
	Symbol         string
	ThresholdCents int64
}

func (a *PriceAlert) Update(symbol string, priceCents int64) {
	if symbol == a.Symbol && priceCents > a.ThresholdCents {
		fmt.Printf("  [alert] %s is above %s: now %s\n", symbol, money(a.ThresholdCents), money(priceCents))
	}
}

// Holding is a number of shares of one symbol.
type Holding struct {
	Symbol string
	Shares int64
}

// PortfolioTracker is a Concrete Observer with its own state: it remembers the
// last price of each holding and recomputes the value when one changes.
type PortfolioTracker struct {
	holdings   []Holding
	lastPrices map[string]int64
}

// NewPortfolioTracker returns a tracker for the given holdings.
func NewPortfolioTracker(holdings ...Holding) *PortfolioTracker {
	return &PortfolioTracker{holdings: holdings, lastPrices: map[string]int64{}}
}

// ValueCents returns the current portfolio value in cents.
func (p *PortfolioTracker) ValueCents() int64 {
	var total int64
	for _, h := range p.holdings {
		total += p.lastPrices[h.Symbol] * h.Shares
	}
	return total
}

func (p *PortfolioTracker) Update(symbol string, priceCents int64) {
	if !slices.ContainsFunc(p.holdings, func(h Holding) bool { return h.Symbol == symbol }) {
		return
	}
	p.lastPrices[symbol] = priceCents
	fmt.Printf("  [portfolio] value: %s\n", money(p.ValueCents()))
}

func money(cents int64) string { return fmt.Sprintf("$%d.%02d", cents/100, cents%100) }

func main() {
	fmt.Println("=== Observer Pattern: Stock price ticker ===")

	ticker := NewStockTicker()

	// The subject only knows the StockObserver interface.
	unsubscribeDisplay := ticker.Subscribe(&PriceDisplay{})
	ticker.Subscribe(&PriceAlert{Symbol: "AAPL", ThresholdCents: 20000})
	ticker.Subscribe(NewPortfolioTracker(Holding{"AAPL", 10}, Holding{"MSFT", 5}))

	ticker.SetPrice("AAPL", 19550)
	ticker.SetPrice("MSFT", 41020)
	ticker.SetPrice("AAPL", 20125)

	unsubscribeDisplay()
	fmt.Println("-- display unsubscribed --")

	ticker.SetPrice("AAPL", 20310)
	ticker.SetPrice("GOOG", 17240) // nobody cares about GOOG: no reactions
	ticker.SetPrice("MSFT", 39800)
}
