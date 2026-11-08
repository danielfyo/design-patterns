package main

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

const merchant = "MERCHANT-42"

func newAdapter() *PayProAdapter {
	return &PayProAdapter{sdk: &LegacyPayProSdk{}, merchantID: merchant}
}

// recordingProcessor is a Target implementation that records what the client asked for.
type recordingProcessor struct {
	calls []string
}

func (*recordingProcessor) Name() string { return "Recording" }

func (p *recordingProcessor) Pay(amount float64, currency string) PaymentResult {
	p.calls = append(p.calls, money(toCents(amount))+" "+currency)
	return PaymentResult{Success: true, TransactionID: "REC-1", Message: "Recorded"}
}

// Compile-time proof that both the native processor and the adapter satisfy the Target.
var (
	_ PaymentProcessor = (*InternalWalletProcessor)(nil)
	_ PaymentProcessor = (*PayProAdapter)(nil)
)

func TestAdapterTranslatesDollarsToCentsAndAddsTheMerchantID(t *testing.T) {
	out := captureStdout(t, func() { newAdapter().Pay(49.99, "USD") })

	want := `[paypro-sdk] makeTransaction(4999, "USD", "MERCHANT-42") -> "00|PP-000001"`
	if !strings.Contains(out, want) {
		t.Errorf("output %q does not contain %q", out, want)
	}
}

func TestAdapterRoundsHalfCentsAwayFromZero(t *testing.T) {
	out := captureStdout(t, func() { newAdapter().Pay(10.125, "USD") })

	if !strings.Contains(out, "makeTransaction(1013, ") {
		t.Errorf("output %q does not show 1013 cents", out)
	}
}

func TestApprovedCodeBecomesASuccessfulResultWithTheSdkReference(t *testing.T) {
	adapter := newAdapter()
	var first, second PaymentResult
	captureStdout(t, func() {
		first = adapter.Pay(10, "USD")
		second = adapter.Pay(10, "EUR")
	})

	if want := (PaymentResult{true, "PP-000001", "Approved"}); first != want {
		t.Errorf("first = %+v, want %+v", first, want)
	}
	if want := (PaymentResult{true, "PP-000002", "Approved"}); second != want {
		t.Errorf("second = %+v, want %+v", second, want)
	}
}

func TestErrorCodesBecomeFailedResultsWithAReadableMessage(t *testing.T) {
	tests := []struct {
		amount   float64
		currency string
		message  string
	}{
		{19.50, "GBP", "Currency not supported by PayPro"},
		{750.00, "USD", "Declined: amount over limit"},
	}
	for _, tt := range tests {
		t.Run(tt.message, func(t *testing.T) {
			var got PaymentResult
			captureStdout(t, func() { got = newAdapter().Pay(tt.amount, tt.currency) })

			if want := (PaymentResult{Message: tt.message}); got != want {
				t.Errorf("Pay() = %+v, want %+v", got, want)
			}
		})
	}
}

func TestAmountExactlyAtTheSdkLimitIsStillApproved(t *testing.T) {
	var got PaymentResult
	captureStdout(t, func() { got = newAdapter().Pay(500.00, "USD") })

	if !got.Success {
		t.Errorf("Pay(500) = %+v, want success", got)
	}
}

func TestWalletDebitsItsBalanceAndRejectsPaymentsItCannotCover(t *testing.T) {
	wallet := NewInternalWalletProcessor(100)
	var paid, rejected, exact PaymentResult
	captureStdout(t, func() {
		paid = wallet.Pay(49.99, "USD")
		rejected = wallet.Pay(75, "USD")
		exact = wallet.Pay(50.01, "USD")
	})

	if want := (PaymentResult{true, "WAL-0001", "Paid from wallet"}); paid != want {
		t.Errorf("paid = %+v, want %+v", paid, want)
	}
	if want := (PaymentResult{Message: "Insufficient wallet balance"}); rejected != want {
		t.Errorf("rejected = %+v, want %+v", rejected, want)
	}
	if want := (PaymentResult{true, "WAL-0002", "Paid from wallet"}); exact != want {
		t.Errorf("exact = %+v, want %+v", exact, want)
	}
}

func TestCheckoutOnlyDependsOnTheTargetInterface(t *testing.T) {
	processor := &recordingProcessor{}
	var result PaymentResult
	out := captureStdout(t, func() {
		result = CheckoutService{processor: processor}.Checkout("A-1", 12.50, "EUR")
	})

	if len(processor.calls) != 1 || processor.calls[0] != "12.50 EUR" {
		t.Errorf("calls = %v, want [12.50 EUR]", processor.calls)
	}
	if result.TransactionID != "REC-1" {
		t.Errorf("TransactionID = %q, want REC-1", result.TransactionID)
	}
	want := "  Order A-1: 12.50 EUR\n    result: success=true, id=REC-1, message=Recorded\n"
	if out != want {
		t.Errorf("output = %q, want %q", out, want)
	}
}

func TestCheckoutRunsUnchangedAgainstTheAdaptedSdk(t *testing.T) {
	var result PaymentResult
	out := captureStdout(t, func() {
		result = CheckoutService{processor: newAdapter()}.Checkout("A-1004", 19.50, "GBP")
	})

	if result.Success {
		t.Errorf("result = %+v, want a failure", result)
	}
	want := "  Order A-1004: 19.50 GBP\n" +
		"    [adapter] 19.50 GBP -> 1950 cents, merchant MERCHANT-42\n" +
		"    [paypro-sdk] makeTransaction(1950, \"GBP\", \"MERCHANT-42\") -> \"14|\"\n" +
		"    result: success=false, id=-, message=Currency not supported by PayPro\n"
	if out != want {
		t.Errorf("output = %q, want %q", out, want)
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
