// Facade pattern: one simple PlaceOrder call in front of four subsystems.
//
// Run with: go run ./patterns/structural/facade/go
package main

import (
	"fmt"
	"strings"
)

// OrderResult is what the facade returns: one simple value instead of four
// subsystem results.
type OrderResult struct {
	Success    bool
	TotalCents int64
	Tracking   string
	Error      string
}

// OrderFacade is the Facade: one simple entry point for "place an order". It
// knows which subsystems to call, in which order, and how to undo partial work
// when a step fails. Clients no longer orchestrate the subsystems themselves.
type OrderFacade struct {
	inventory    *InventoryService
	payment      *PaymentService
	shipping     *ShippingService
	notification NotificationService
}

func NewOrderFacade(inv *InventoryService, pay *PaymentService, ship *ShippingService, notif NotificationService) *OrderFacade {
	return &OrderFacade{inventory: inv, payment: pay, shipping: ship, notification: notif}
}

func (f *OrderFacade) PlaceOrder(customer Customer, items []OrderItem, cardNumber string) OrderResult {
	// 1-2. Check stock and reserve each item; roll back earlier reservations on failure.
	var reserved []OrderItem
	for _, item := range items {
		if !f.inventory.IsAvailable(item.Sku, item.Quantity) {
			for _, r := range reserved {
				f.inventory.Release(r.Sku, r.Quantity)
			}
			f.notification.SendEmail(customer.Email, fmt.Sprintf("Order failed: %s is out of stock", item.Sku))
			return OrderResult{Error: fmt.Sprintf("%s is out of stock (requested %d, available %d)",
				item.Sku, item.Quantity, f.inventory.StockOf(item.Sku))}
		}
		f.inventory.Reserve(item.Sku, item.Quantity)
		reserved = append(reserved, item)
	}

	// 3. Charge the card.
	var total int64
	for _, i := range items {
		total += f.inventory.PriceOf(i.Sku) * int64(i.Quantity)
	}
	f.payment.Charge(cardNumber, total)

	// 4. Create the shipment.
	tracking := f.shipping.CreateShipment(customer, items)

	// 5. Tell the customer.
	f.notification.SendEmail(customer.Email, fmt.Sprintf("Order confirmed, total %s, tracking %s", money(total), tracking))
	return OrderResult{Success: true, TotalCents: total, Tracking: tracking}
}

func main() {
	fmt.Println("=== Facade Pattern: E-commerce order placement ===")

	inventory := NewInventoryService()
	shop := NewOrderFacade(inventory, NewPaymentService(), NewShippingService(), NotificationService{})

	// The client makes ONE call per order; the facade does the orchestration.
	placeAndReport := func(number int, customer Customer, items []OrderItem) {
		parts := make([]string, len(items))
		for i, it := range items {
			parts[i] = fmt.Sprintf("%d x %s", it.Quantity, it.Sku)
		}
		fmt.Printf("Order %d: %s buys %s\n", number, customer.Name, strings.Join(parts, ", "))
		result := shop.PlaceOrder(customer, items, "4242 4242 4242 4242")
		if result.Success {
			fmt.Printf("Result: success=true, total=%s, tracking=%s\n", money(result.TotalCents), result.Tracking)
		} else {
			fmt.Printf("Result: success=false, error=%s\n", result.Error)
		}
	}

	placeAndReport(1, Customer{"Alice", "alice@example.com"}, []OrderItem{{"keyboard", 2}, {"mouse", 1}})
	fmt.Println()
	placeAndReport(2, Customer{"Bob", "bob@example.com"}, []OrderItem{{"monitor", 1}, {"webcam", 5}})
	fmt.Println()

	skus := []string{"keyboard", "mouse", "monitor", "webcam"}
	stock := make([]string, len(skus))
	for i, s := range skus {
		stock[i] = fmt.Sprintf("%s=%d", s, inventory.StockOf(s))
	}
	fmt.Printf("Stock after both orders: %s\n", strings.Join(stock, ", "))
}
