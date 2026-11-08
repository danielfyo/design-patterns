package main

import (
	"bytes"
	"io"
	"os"
	"reflect"
	"strings"
	"testing"
)

const card = "4242 4242 4242 4242"

var alice = Customer{"Alice", "alice@example.com"}

func newShop() (*OrderFacade, *InventoryService) {
	inventory := NewInventoryService()
	return NewOrderFacade(inventory, NewPaymentService(), NewShippingService(), NotificationService{}), inventory
}

func TestSuccessfulOrderReturnsTotalAndTrackingAndReservesStock(t *testing.T) {
	shop, inventory := newShop()
	var result OrderResult

	captureStdout(t, func() {
		result = shop.PlaceOrder(alice, []OrderItem{{"keyboard", 2}, {"mouse", 1}}, card)
	})

	want := OrderResult{Success: true, TotalCents: 18997, Tracking: "SHP-5001"}
	if result != want {
		t.Errorf("result = %+v, want %+v", result, want)
	}
	if inventory.StockOf("keyboard") != 8 || inventory.StockOf("mouse") != 4 {
		t.Errorf("stock keyboard=%d mouse=%d, want 8 and 4", inventory.StockOf("keyboard"), inventory.StockOf("mouse"))
	}
}

func TestFacadeCallsTheSubsystemsInOrder(t *testing.T) {
	shop, _ := newShop()

	out := captureStdout(t, func() { shop.PlaceOrder(alice, []OrderItem{{"monitor", 1}}, card) })

	var tags []string
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		tags = append(tags, strings.Fields(line)[0])
	}
	want := []string{"[inventory]", "[inventory]", "[payment]", "[shipping]", "[email]"}
	if !reflect.DeepEqual(tags, want) {
		t.Errorf("subsystem order = %v, want %v", tags, want)
	}
}

func TestOutOfStockItemRollsBackEarlierReservations(t *testing.T) {
	shop, inventory := newShop()
	var result OrderResult

	out := captureStdout(t, func() {
		result = shop.PlaceOrder(alice, []OrderItem{{"monitor", 1}, {"webcam", 5}}, card)
	})

	if result.Success || result.Tracking != "" {
		t.Errorf("result = %+v, want a failure without tracking", result)
	}
	if want := "webcam is out of stock (requested 5, available 3)"; result.Error != want {
		t.Errorf("Error = %q, want %q", result.Error, want)
	}
	if inventory.StockOf("monitor") != 5 || inventory.StockOf("webcam") != 3 {
		t.Errorf("stock not restored: monitor=%d webcam=%d", inventory.StockOf("monitor"), inventory.StockOf("webcam"))
	}
	if !strings.Contains(out, "released monitor x1 (rollback)") {
		t.Errorf("missing rollback line:\n%s", out)
	}
}

func TestFailedOrderNeverChargesOrShipsButNotifiesTheCustomer(t *testing.T) {
	shop, _ := newShop()

	out := captureStdout(t, func() { shop.PlaceOrder(alice, []OrderItem{{"webcam", 4}}, card) })

	for _, forbidden := range []string{"[payment]", "[shipping]", "released"} {
		if strings.Contains(out, forbidden) {
			t.Errorf("unexpected %q in:\n%s", forbidden, out)
		}
	}
	if !strings.Contains(out, "[email] to alice@example.com: Order failed: webcam is out of stock") {
		t.Errorf("missing failure e-mail:\n%s", out)
	}
}

func TestFailedOrderDoesNotConsumeATrackingNumber(t *testing.T) {
	shop, _ := newShop()
	var result OrderResult

	captureStdout(t, func() {
		shop.PlaceOrder(alice, []OrderItem{{"webcam", 9}}, card)
		result = shop.PlaceOrder(alice, []OrderItem{{"webcam", 1}}, card)
	})

	if result.Tracking != "SHP-5001" {
		t.Errorf("Tracking = %q, want SHP-5001", result.Tracking)
	}
}

func TestConsecutiveOrdersShareTheSubsystemsState(t *testing.T) {
	shop, inventory := newShop()
	var first, second OrderResult

	captureStdout(t, func() {
		first = shop.PlaceOrder(alice, []OrderItem{{"webcam", 2}}, card)
		second = shop.PlaceOrder(alice, []OrderItem{{"webcam", 2}}, card)
	})

	if first.Tracking != "SHP-5001" {
		t.Errorf("first tracking = %q", first.Tracking)
	}
	if want := "webcam is out of stock (requested 2, available 1)"; second.Success || second.Error != want {
		t.Errorf("second = %+v, want error %q", second, want)
	}
	if inventory.StockOf("webcam") != 1 {
		t.Errorf("webcam stock = %d, want 1", inventory.StockOf("webcam"))
	}
}

func TestMoneyFormatsCents(t *testing.T) {
	tests := map[int64]string{0: "$0.00", 5: "$0.05", 18997: "$189.97", 19900: "$199.00"}
	for cents, want := range tests {
		if got := money(cents); got != want {
			t.Errorf("money(%d) = %q, want %q", cents, got, want)
		}
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
