// Adapter pattern: plugging an incompatible third-party payment SDK into our checkout.
//
// Run with: go run ./patterns/structural/adapter/go
package main

import (
	"fmt"
	"math"
	"slices"
	"strings"
)

// PaymentResult is the outcome of a payment, in the application's own vocabulary.
type PaymentResult struct {
	Success       bool
	TransactionID string // empty when the payment failed
	Message       string
}

// PaymentProcessor is the Target: the interface the application wants to work with.
// Go has no decimal type, so the application speaks float64 dollars at this boundary;
// implementations convert to integer cents internally before doing any arithmetic.
type PaymentProcessor interface {
	Name() string
	Pay(amount float64, currency string) PaymentResult
}

func toCents(amount float64) int64 { return int64(math.Round(amount * 100)) }

func money(cents int64) string { return fmt.Sprintf("%d.%02d", cents/100, cents%100) }

// InternalWalletProcessor is a native implementation of the Target: it needs no adapter.
type InternalWalletProcessor struct {
	balanceCents int64
	nextID       int
}

func NewInternalWalletProcessor(balance float64) *InternalWalletProcessor {
	return &InternalWalletProcessor{balanceCents: toCents(balance), nextID: 1}
}

func (w *InternalWalletProcessor) Name() string { return "Internal wallet" }

func (w *InternalWalletProcessor) Pay(amount float64, currency string) PaymentResult {
	cents := toCents(amount)
	if cents > w.balanceCents {
		fmt.Printf("    [wallet] insufficient balance: %s < %s\n", money(w.balanceCents), money(cents))
		return PaymentResult{Message: "Insufficient wallet balance"}
	}
	before := w.balanceCents
	w.balanceCents -= cents
	fmt.Printf("    [wallet] debit %s %s (balance %s -> %s)\n", money(cents), currency, money(before), money(w.balanceCents))
	id := fmt.Sprintf("WAL-%04d", w.nextID)
	w.nextID++
	return PaymentResult{Success: true, TransactionID: id, Message: "Paid from wallet"}
}

// LegacyPayProSdk is the Adaptee: a (fictional) third-party SDK we cannot change.
// Its API is incompatible with ours: integer cents, a merchant id on every call,
// and a "code|reference" string as the response.
type LegacyPayProSdk struct {
	nextReference int
}

const payProMaxAmountInCents = 50_000

var payProSupportedCurrencies = []string{"USD", "EUR"}

// MakeTransaction returns "00|PP-000001" on success, "14|" for an unsupported
// currency and "51|" when the amount is over the limit.
func (s *LegacyPayProSdk) MakeTransaction(amountInCents int, currencyCode, merchantID string) string {
	var response string
	switch {
	case !slices.Contains(payProSupportedCurrencies, currencyCode):
		response = "14|"
	case amountInCents > payProMaxAmountInCents:
		response = "51|"
	default:
		s.nextReference++
		response = fmt.Sprintf("00|PP-%06d", s.nextReference)
	}
	fmt.Printf("    [paypro-sdk] makeTransaction(%d, %q, %q) -> %q\n", amountInCents, currencyCode, merchantID, response)
	return response
}

// PayProAdapter is the Adapter (object adapter): it satisfies PaymentProcessor and
// holds a reference to the Adaptee, translating dollars to cents on the way in and
// status codes to PaymentResult on the way out.
type PayProAdapter struct {
	sdk        *LegacyPayProSdk
	merchantID string
}

func (a *PayProAdapter) Name() string { return "PayPro (adapted)" }

func (a *PayProAdapter) Pay(amount float64, currency string) PaymentResult {
	cents := toCents(amount)
	fmt.Printf("    [adapter] %s %s -> %d cents, merchant %s\n", money(cents), currency, cents, a.merchantID)

	code, reference, _ := strings.Cut(a.sdk.MakeTransaction(int(cents), currency, a.merchantID), "|")
	switch code {
	case "00":
		return PaymentResult{Success: true, TransactionID: reference, Message: "Approved"}
	case "14":
		return PaymentResult{Message: "Currency not supported by PayPro"}
	case "51":
		return PaymentResult{Message: "Declined: amount over limit"}
	default:
		return PaymentResult{Message: "Unknown PayPro status " + code}
	}
}

// CheckoutService is the Client: it only knows PaymentProcessor, so any gateway
// (native or adapted) plugs in.
type CheckoutService struct {
	processor PaymentProcessor
}

func (c CheckoutService) Checkout(orderID string, amount float64, currency string) PaymentResult {
	fmt.Printf("  Order %s: %.2f %s\n", orderID, amount, currency)
	result := c.processor.Pay(amount, currency)
	id := result.TransactionID
	if id == "" {
		id = "-"
	}
	fmt.Printf("    result: success=%t, id=%s, message=%s\n", result.Success, id, result.Message)
	return result
}

type orderLine struct {
	id       string
	amount   float64
	currency string
}

func main() {
	fmt.Println("=== Adapter Pattern: Payment gateway integration ===")

	// The wallet implements PaymentProcessor natively; the legacy SDK is wrapped by an adapter.
	var wallet PaymentProcessor = NewInternalWalletProcessor(100.00)
	var payPro PaymentProcessor = &PayProAdapter{sdk: &LegacyPayProSdk{}, merchantID: "MERCHANT-42"}

	runs := []struct {
		processor PaymentProcessor
		orders    []orderLine
	}{
		{wallet, []orderLine{{"A-1001", 49.99, "USD"}, {"A-1002", 75.00, "USD"}}},
		{payPro, []orderLine{{"A-1003", 49.99, "USD"}, {"A-1004", 19.50, "GBP"}, {"A-1005", 750.00, "USD"}}},
	}

	for _, run := range runs {
		fmt.Printf("Checkout with %s\n", run.processor.Name())
		// The same CheckoutService code runs against both processors.
		checkout := CheckoutService{processor: run.processor}
		for _, o := range run.orders {
			checkout.Checkout(o.id, o.amount, o.currency)
		}
	}
}
