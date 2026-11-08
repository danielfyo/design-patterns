package main

import (
	"bytes"
	"io"
	"os"
	"slices"
	"strings"
	"testing"
)

type update struct {
	symbol     string
	priceCents int64
}

// recorder is an observer that records every notification it gets.
type recorder struct{ updates []update }

func (r *recorder) Update(symbol string, priceCents int64) {
	r.updates = append(r.updates, update{symbol, priceCents})
}

// oneShot is an observer that unsubscribes itself on its first notification.
type oneShot struct {
	ticker *StockTicker
	calls  int
}

func (o *oneShot) Update(string, int64) {
	o.calls++
	o.ticker.Unsubscribe(o)
}

func TestEverySubscriberIsNotifiedOfAPriceChange(t *testing.T) {
	ticker := NewStockTicker()
	first, second := &recorder{}, &recorder{}
	ticker.Subscribe(first)
	ticker.Subscribe(second)

	out := captureStdout(t, func() { ticker.SetPrice("AAPL", 19550) })

	want := []update{{"AAPL", 19550}}
	if !slices.Equal(first.updates, want) || !slices.Equal(second.updates, want) {
		t.Errorf("updates = %v and %v, want %v", first.updates, second.updates, want)
	}
	if out != "[ticker] AAPL = $195.50 (notifying 2 observers)\n" {
		t.Errorf("output = %q", out)
	}
}

func TestUnsubscribeStopsNotifications(t *testing.T) {
	captureStdout(t, func() {
		ticker := NewStockTicker()
		o := &recorder{}
		ticker.Subscribe(o)
		ticker.SetPrice("AAPL", 100)

		ticker.Unsubscribe(o)
		ticker.SetPrice("AAPL", 200)

		if want := []update{{"AAPL", 100}}; !slices.Equal(o.updates, want) {
			t.Errorf("updates = %v, want %v", o.updates, want)
		}
	})
}

func TestSubscribeReturnsAFunctionThatUnsubscribes(t *testing.T) {
	captureStdout(t, func() {
		ticker := NewStockTicker()
		o := &recorder{}
		unsubscribe := ticker.Subscribe(o)

		unsubscribe()
		unsubscribe() // calling it twice is harmless
		ticker.SetPrice("AAPL", 100)

		if len(o.updates) != 0 {
			t.Errorf("updates = %v, want none", o.updates)
		}
	})
}

func TestObserverMayUnsubscribeWhileBeingNotifiedWithoutSkippingOthers(t *testing.T) {
	captureStdout(t, func() {
		ticker := NewStockTicker()
		once, r := &oneShot{ticker: ticker}, &recorder{}
		ticker.Subscribe(once)
		ticker.Subscribe(r)

		ticker.SetPrice("AAPL", 100)
		ticker.SetPrice("AAPL", 200)

		if once.calls != 1 || len(r.updates) != 2 {
			t.Errorf("oneShot calls %d, recorder updates %d; want 1, 2", once.calls, len(r.updates))
		}
	})
}

func TestTickerRemembersTheLatestPriceOfEachSymbol(t *testing.T) {
	ticker := NewStockTicker()
	captureStdout(t, func() {
		ticker.SetPrice("AAPL", 100)
		ticker.SetPrice("AAPL", 200)
	})

	if p, ok := ticker.Price("AAPL"); !ok || p != 200 {
		t.Errorf("Price(AAPL) = %d, %v; want 200, true", p, ok)
	}
	if _, ok := ticker.Price("GOOG"); ok {
		t.Error("Price(GOOG) reported a price that was never set")
	}
}

func TestPriceAlertFiresOnlyAboveTheThresholdOfItsSymbol(t *testing.T) {
	tests := []struct {
		symbol string
		price  int64
		fires  bool
	}{
		{"AAPL", 20125, true},
		{"AAPL", 20000, false},
		{"AAPL", 15000, false},
		{"MSFT", 99900, false},
	}
	alert := &PriceAlert{Symbol: "AAPL", ThresholdCents: 20000}
	for _, tt := range tests {
		out := captureStdout(t, func() { alert.Update(tt.symbol, tt.price) })

		if got := strings.Contains(out, "[alert]"); got != tt.fires {
			t.Errorf("Update(%s, %d) fired = %v, want %v", tt.symbol, tt.price, got, tt.fires)
		}
	}
}

func TestPortfolioTrackerValuesItsHoldingsAndIgnoresOtherSymbols(t *testing.T) {
	ticker := NewStockTicker()
	portfolio := NewPortfolioTracker(Holding{"AAPL", 10}, Holding{"MSFT", 5})
	ticker.Subscribe(portfolio)
	if portfolio.ValueCents() != 0 {
		t.Fatalf("initial value = %d, want 0", portfolio.ValueCents())
	}

	out := captureStdout(t, func() {
		ticker.SetPrice("AAPL", 19550)
		ticker.SetPrice("MSFT", 41020)
		ticker.SetPrice("GOOG", 17240)
	})

	if portfolio.ValueCents() != 400600 {
		t.Errorf("ValueCents() = %d, want 400600", portfolio.ValueCents())
	}
	if want := "[ticker] GOOG = $172.40 (notifying 1 observers)\n"; !strings.HasSuffix(out, want) {
		t.Errorf("output = %q, want suffix %q", out, want)
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
