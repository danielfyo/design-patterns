package main

import (
	"bytes"
	"io"
	"math"
	"os"
	"testing"
)

var regular = Context{"price": 20, "quantity": 3, "discount": 5, "shipping": 6, "taxRate": 0.21}

func approx(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestAHandBuiltASTIsInterpretedWithoutAParser(t *testing.T) {
	ast := NewMultiply(Variable{"price"}, NumberLiteral{0.9})

	got, err := ast.Interpret(regular)
	if err != nil || !approx(got, 18) {
		t.Errorf("Interpret() = %v, %v; want 18", got, err)
	}
	if s := ast.String(); s != "(price * 0.9)" {
		t.Errorf("String() = %q", s)
	}
}

func TestParserRespectsPrecedenceAndLeftAssociativity(t *testing.T) {
	tests := []struct {
		source, ast string
		value       float64
	}{
		{"1 + 2 * 3", "(1 + (2 * 3))", 7},
		{"(1 + 2) * 3", "((1 + 2) * 3)", 9},
		{"10 - 4 - 3", "((10 - 4) - 3)", 3},
		{"24 / 4 / 2", "((24 / 4) / 2)", 3},
		{"price * quantity - discount", "((price * quantity) - discount)", 55},
	}
	for _, tt := range tests {
		t.Run(tt.source, func(t *testing.T) {
			expr, err := Parse(tt.source)
			if err != nil {
				t.Fatal(err)
			}
			if s := expr.String(); s != tt.ast {
				t.Errorf("String() = %q, want %q", s, tt.ast)
			}
			if got, err := expr.Interpret(regular); err != nil || !approx(got, tt.value) {
				t.Errorf("Interpret() = %v, %v; want %v", got, err, tt.value)
			}
		})
	}
}

func TestTheSameASTIsReinterpretedAgainstDifferentContexts(t *testing.T) {
	ast, err := Parse("(price + shipping) * (1 + taxRate)")
	if err != nil {
		t.Fatal(err)
	}
	bulk := Context{"price": 12.5, "shipping": 8, "taxRate": 0.1}

	if got, _ := ast.Interpret(regular); !approx(got, 31.46) {
		t.Errorf("regular = %v, want 31.46", got)
	}
	if got, _ := ast.Interpret(bulk); !approx(got, 22.55) {
		t.Errorf("bulk = %v, want 22.55", got)
	}
}

func TestUnknownVariableIsAnEvaluationError(t *testing.T) {
	ast, err := Parse("price * coupon")
	if err != nil {
		t.Fatal(err)
	}

	_, err = ast.Interpret(regular)

	if err == nil || err.Error() != "unknown variable 'coupon'" {
		t.Errorf("err = %v", err)
	}
}

func TestDivisionByZeroIsCheckedBeforeTheDividend(t *testing.T) {
	ast, err := Parse("coupon / (quantity - 3)")
	if err != nil {
		t.Fatal(err)
	}

	_, err = ast.Interpret(regular)

	if err == nil || err.Error() != "division by zero" {
		t.Errorf("err = %v, want division by zero", err)
	}
}

func TestSyntaxErrorsAreReportedWithAClearMessage(t *testing.T) {
	tests := []struct{ source, message string }{
		{"(price + 1", "expected ')' but found end of input"},
		{"price +", "expected a number, variable or '(' but found end of input"},
		{"price price", "expected end of input but found 'price'"},
		{"price % 2", "unexpected character '%' at position 6"},
		{"1.2.3", "invalid number '1.2.3' at position 0"},
	}
	for _, tt := range tests {
		t.Run(tt.source, func(t *testing.T) {
			_, err := Parse(tt.source)
			if err == nil || err.Error() != tt.message {
				t.Errorf("err = %v, want %q", err, tt.message)
			}
		})
	}
}

func TestNumbersArePrintedInTheirShortestForm(t *testing.T) {
	tests := []struct {
		value float64
		want  string
	}{{2, "2"}, {0.21, "0.21"}, {12.5, "12.5"}}
	for _, tt := range tests {
		if got := formatNumber(tt.value); got != tt.want {
			t.Errorf("formatNumber(%v) = %q, want %q", tt.value, got, tt.want)
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
