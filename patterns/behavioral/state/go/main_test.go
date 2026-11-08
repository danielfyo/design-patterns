package main

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

var setup = map[string][]string{
	"Pending":   {},
	"Paid":      {"pay"},
	"Shipped":   {"pay", "ship"},
	"Delivered": {"pay", "ship", "deliver"},
	"Cancelled": {"cancel"},
}

func perform(o *Order, action string) {
	switch action {
	case "pay":
		o.Pay()
	case "ship":
		o.Ship()
	case "deliver":
		o.Deliver()
	case "cancel":
		o.Cancel()
	}
}

// orderIn returns an order already moved into the given state (setup output is discarded).
func orderIn(t *testing.T, state string) *Order {
	t.Helper()
	o := NewOrder(1)
	captureStdout(t, func() {
		for _, a := range setup[state] {
			perform(o, a)
		}
	})
	return o
}

func TestNewOrderStartsPending(t *testing.T) {
	o := NewOrder(42)

	if o.ID != 42 {
		t.Errorf("ID = %d, want 42", o.ID)
	}
	if _, ok := o.State().(PendingState); !ok {
		t.Errorf("State() = %T, want PendingState", o.State())
	}
}

func TestHappyPathWalksThroughEveryStateUntilDelivered(t *testing.T) {
	o := NewOrder(1)

	got := captureStdout(t, func() {
		o.Pay()
		o.Ship()
		o.Deliver()
	})

	if _, ok := o.State().(DeliveredState); !ok {
		t.Errorf("State() = %T, want DeliveredState", o.State())
	}
	want := "> pay()\n  Payment accepted: Pending -> Paid\n" +
		"> ship()\n  Order handed to the carrier: Paid -> Shipped\n" +
		"> deliver()\n  Order delivered to the customer: Shipped -> Delivered\n"
	if got != want {
		t.Errorf("output = %q, want %q", got, want)
	}
}

func TestCancellingBeforeShippingMovesToCancelled(t *testing.T) {
	tests := []struct{ from, note string }{
		{"Pending", "Order cancelled, nothing to refund"},
		{"Paid", "Order cancelled, payment refunded"},
	}
	for _, tt := range tests {
		t.Run(tt.from, func(t *testing.T) {
			o := orderIn(t, tt.from)

			got := captureStdout(t, o.Cancel)

			if o.State().Name() != "Cancelled" {
				t.Errorf("State() = %s, want Cancelled", o.State().Name())
			}
			if want := "> cancel()\n  " + tt.note + ": " + tt.from + " -> Cancelled\n"; got != want {
				t.Errorf("output = %q, want %q", got, want)
			}
		})
	}
}

func TestInvalidTransitionIsRejectedAndTheStateIsKept(t *testing.T) {
	tests := []struct{ from, action, err string }{
		{"Pending", "ship", "Cannot ship an order that has not been paid"},
		{"Pending", "deliver", "Cannot deliver an order that has not been shipped"},
		{"Paid", "pay", "Order has already been paid"},
		{"Paid", "deliver", "Cannot deliver an order that has not been shipped"},
		{"Shipped", "ship", "Order has already been shipped"},
		{"Shipped", "cancel", "Cannot cancel an order that has already been shipped"},
		{"Delivered", "deliver", "Order has already been delivered"},
		{"Delivered", "cancel", "Cannot cancel a delivered order"},
		{"Cancelled", "pay", "Cannot pay for a cancelled order"},
		{"Cancelled", "cancel", "Order is already cancelled"},
	}
	for _, tt := range tests {
		t.Run(tt.from+"/"+tt.action, func(t *testing.T) {
			o := orderIn(t, tt.from)

			got := captureStdout(t, func() { perform(o, tt.action) })

			if o.State().Name() != tt.from {
				t.Errorf("State() = %s, want %s", o.State().Name(), tt.from)
			}
			if want := "> " + tt.action + "()\n  ERROR: " + tt.err + "\n"; got != want {
				t.Errorf("output = %q, want %q", got, want)
			}
		})
	}
}

func TestFinalStatesRejectEveryAction(t *testing.T) {
	for _, final := range []string{"Delivered", "Cancelled"} {
		t.Run(final, func(t *testing.T) {
			o := orderIn(t, final)

			got := captureStdout(t, func() {
				for _, a := range []string{"pay", "ship", "deliver", "cancel"} {
					perform(o, a)
				}
			})

			if o.State().Name() != final {
				t.Errorf("State() = %s, want %s", o.State().Name(), final)
			}
			if n := strings.Count(got, "ERROR:"); n != 4 {
				t.Errorf("%d errors, want 4", n)
			}
		})
	}
}

func TestSameActionBehavesDifferentlyDependingOnTheState(t *testing.T) {
	pending := orderIn(t, "Pending")
	paid := orderIn(t, "Paid")

	captureStdout(t, func() {
		pending.Ship()
		paid.Ship()
	})

	if pending.State().Name() != "Pending" {
		t.Errorf("pending order moved to %s", pending.State().Name())
	}
	if paid.State().Name() != "Shipped" {
		t.Errorf("paid order is %s, want Shipped", paid.State().Name())
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
