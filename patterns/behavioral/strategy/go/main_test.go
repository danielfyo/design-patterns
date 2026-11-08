package main

import (
	"bytes"
	"io"
	"os"
	"testing"
)

var (
	lightOrder = Order{SubtotalCents: 8000, WeightKg: 4}
	bigOrder   = Order{SubtotalCents: 15000, WeightKg: 4}
)

func TestEachStrategyPricesTheSameOrderDifferently(t *testing.T) {
	tests := []struct {
		strategy ShippingStrategy
		want     int64
	}{
		{StandardShipping{}, 1100},
		{ExpressShipping{}, 2700},
		{StorePickup{}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.strategy.Name(), func(t *testing.T) {
			if got := tt.strategy.Calculate(lightOrder); got != tt.want {
				t.Errorf("Calculate() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestFreeOverThresholdFallsBackBelowTheThreshold(t *testing.T) {
	s := FreeOverThresholdShipping{ThresholdCents: 10000, Fallback: StandardShipping{}}

	if got := s.Calculate(lightOrder); got != 1100 {
		t.Errorf("below threshold = %d, want 1100", got)
	}
	if got := s.Calculate(bigOrder); got != 0 {
		t.Errorf("above threshold = %d, want 0", got)
	}
	if got := s.Name(); got != "Free over $100" {
		t.Errorf("Name() = %q", got)
	}
}

func TestContextDelegatesToTheStrategySwappedAtRuntime(t *testing.T) {
	calc := &ShippingCalculator{Strategy: StandardShipping{}}
	if got := calc.Quote(lightOrder); got != 1100 {
		t.Fatalf("standard = %d, want 1100", got)
	}

	calc.Strategy = ExpressShipping{}

	if got := calc.Quote(lightOrder); got != 2700 {
		t.Errorf("express = %d, want 2700", got)
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
