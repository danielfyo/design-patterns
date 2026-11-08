// State pattern: an order whose behavior changes with its lifecycle state.
//
// Run with: go run ./patterns/behavioral/state/go
package main

import "fmt"

// OrderState is the State interface: one method per action of the context.
// Each concrete state decides which actions are valid and what comes next.
type OrderState interface {
	Name() string
	Pay(o *Order)
	Ship(o *Order)
	Deliver(o *Order)
	Cancel(o *Order)
}

// Order is the Context: it delegates every action to its current state.
type Order struct {
	ID    int
	state OrderState
}

// NewOrder creates an order in its initial state.
func NewOrder(id int) *Order { return &Order{ID: id, state: PendingState{}} }

// State returns the current state.
func (o *Order) State() OrderState { return o.state }

func (o *Order) Pay()     { fmt.Println("> pay()"); o.state.Pay(o) }
func (o *Order) Ship()    { fmt.Println("> ship()"); o.state.Ship(o) }
func (o *Order) Deliver() { fmt.Println("> deliver()"); o.state.Deliver(o) }
func (o *Order) Cancel()  { fmt.Println("> cancel()"); o.state.Cancel(o) }

// transitionTo is called by the states themselves: states know their successors.
func (o *Order) transitionTo(next OrderState, note string) {
	fmt.Printf("  %s: %s -> %s\n", note, o.state.Name(), next.Name())
	o.state = next
}

// reject is the shared helper for invalid actions: the state stays the same.
func reject(reason string) { fmt.Printf("  ERROR: %s\n", reason) }

// PendingState is a concrete state: created but not paid yet.
type PendingState struct{}

func (PendingState) Name() string   { return "Pending" }
func (PendingState) Pay(o *Order)   { o.transitionTo(PaidState{}, "Payment accepted") }
func (PendingState) Ship(*Order)    { reject("Cannot ship an order that has not been paid") }
func (PendingState) Deliver(*Order) { reject("Cannot deliver an order that has not been shipped") }
func (PendingState) Cancel(o *Order) {
	o.transitionTo(CancelledState{}, "Order cancelled, nothing to refund")
}

// PaidState is a concrete state: paid and waiting to be shipped.
type PaidState struct{}

func (PaidState) Name() string   { return "Paid" }
func (PaidState) Pay(*Order)     { reject("Order has already been paid") }
func (PaidState) Ship(o *Order)  { o.transitionTo(ShippedState{}, "Order handed to the carrier") }
func (PaidState) Deliver(*Order) { reject("Cannot deliver an order that has not been shipped") }
func (PaidState) Cancel(o *Order) {
	o.transitionTo(CancelledState{}, "Order cancelled, payment refunded")
}

// ShippedState is a concrete state: on its way to the customer.
type ShippedState struct{}

func (ShippedState) Name() string { return "Shipped" }
func (ShippedState) Pay(*Order)   { reject("Order has already been paid") }
func (ShippedState) Ship(*Order)  { reject("Order has already been shipped") }
func (ShippedState) Deliver(o *Order) {
	o.transitionTo(DeliveredState{}, "Order delivered to the customer")
}
func (ShippedState) Cancel(*Order) { reject("Cannot cancel an order that has already been shipped") }

// DeliveredState is a concrete state: final, every action is rejected.
type DeliveredState struct{}

func (DeliveredState) Name() string   { return "Delivered" }
func (DeliveredState) Pay(*Order)     { reject("Order has already been paid") }
func (DeliveredState) Ship(*Order)    { reject("Order has already been delivered") }
func (DeliveredState) Deliver(*Order) { reject("Order has already been delivered") }
func (DeliveredState) Cancel(*Order)  { reject("Cannot cancel a delivered order") }

// CancelledState is a concrete state: final, reached by cancelling.
type CancelledState struct{}

func (CancelledState) Name() string   { return "Cancelled" }
func (CancelledState) Pay(*Order)     { reject("Cannot pay for a cancelled order") }
func (CancelledState) Ship(*Order)    { reject("Cannot ship a cancelled order") }
func (CancelledState) Deliver(*Order) { reject("Cannot deliver a cancelled order") }
func (CancelledState) Cancel(*Order)  { reject("Order is already cancelled") }

func main() {
	fmt.Println("=== State Pattern: Order lifecycle ===")

	// Happy path, plus two actions that the current state rejects.
	fmt.Println("--- Order #1001: happy path ---")
	first := NewOrder(1001)
	fmt.Printf("Order #%d created [%s]\n", first.ID, first.State().Name())
	first.Pay()
	first.Ship()
	first.Cancel()
	first.Deliver()
	first.Cancel()
	fmt.Printf("Order #%d final state: %s\n", first.ID, first.State().Name())

	// Same actions, different results: the behavior depends on the current state.
	fmt.Println("--- Order #1002: cancellation ---")
	second := NewOrder(1002)
	fmt.Printf("Order #%d created [%s]\n", second.ID, second.State().Name())
	second.Ship()
	second.Pay()
	second.Cancel()
	second.Deliver()
	fmt.Printf("Order #%d final state: %s\n", second.ID, second.State().Name())
}
