package main

import "fmt"

// Customer places orders.
type Customer struct {
	Name  string
	Email string
}

// OrderItem is one line of an order. Prices are kept in cents.
type OrderItem struct {
	Sku      string
	Quantity int
}

func money(cents int64) string { return fmt.Sprintf("$%d.%02d", cents/100, cents%100) }

// InventoryService is a subsystem: it knows prices and stock levels, and
// reserves/releases units.
type InventoryService struct {
	prices map[string]int64
	stock  map[string]int
}

func NewInventoryService() *InventoryService {
	return &InventoryService{
		prices: map[string]int64{"keyboard": 7999, "mouse": 2999, "monitor": 19900, "webcam": 4950},
		stock:  map[string]int{"keyboard": 10, "mouse": 5, "monitor": 5, "webcam": 3},
	}
}

func (s *InventoryService) PriceOf(sku string) int64 { return s.prices[sku] }
func (s *InventoryService) StockOf(sku string) int   { return s.stock[sku] }

func (s *InventoryService) IsAvailable(sku string, quantity int) bool {
	inStock := s.stock[sku]
	if inStock >= quantity {
		fmt.Printf("  [inventory] check %s x%d: ok (%d in stock)\n", sku, quantity, inStock)
		return true
	}
	fmt.Printf("  [inventory] check %s x%d: only %d in stock\n", sku, quantity, inStock)
	return false
}

func (s *InventoryService) Reserve(sku string, quantity int) {
	s.stock[sku] -= quantity
	fmt.Printf("  [inventory] reserved %s x%d\n", sku, quantity)
}

func (s *InventoryService) Release(sku string, quantity int) {
	s.stock[sku] += quantity
	fmt.Printf("  [inventory] released %s x%d (rollback)\n", sku, quantity)
}

// PaymentService is a subsystem: it charges and refunds cards (simulated gateway).
type PaymentService struct{ nextTransaction int }

func NewPaymentService() *PaymentService { return &PaymentService{nextTransaction: 1001} }

func (p *PaymentService) Charge(cardNumber string, amountCents int64) string {
	id := fmt.Sprintf("TXN-%d", p.nextTransaction)
	p.nextTransaction++
	fmt.Printf("  [payment] charged %s to card ending %s (%s)\n", money(amountCents), cardNumber[len(cardNumber)-4:], id)
	return id
}

func (p *PaymentService) Refund(transactionID string, amountCents int64) {
	fmt.Printf("  [payment] refunded %s (%s)\n", money(amountCents), transactionID)
}

// ShippingService is a subsystem: it books shipments with the carrier.
type ShippingService struct{ nextShipment int }

func NewShippingService() *ShippingService { return &ShippingService{nextShipment: 5001} }

func (s *ShippingService) CreateShipment(customer Customer, items []OrderItem) string {
	tracking := fmt.Sprintf("SHP-%d", s.nextShipment)
	s.nextShipment++
	units := 0
	for _, i := range items {
		units += i.Quantity
	}
	fmt.Printf("  [shipping] shipment %s created for %s (%d items)\n", tracking, customer.Name, units)
	return tracking
}

// NotificationService is a subsystem: it sends e-mails to customers.
type NotificationService struct{}

func (NotificationService) SendEmail(to, message string) {
	fmt.Printf("  [email] to %s: %s\n", to, message)
}
