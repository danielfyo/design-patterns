// Interpreter pattern: a tiny pricing-rule expression language.
//
// The pattern lives in expressions.go (one type per grammar rule); parser.go is
// a helper that builds those ASTs from text.
//
// Run with: go run ./patterns/behavioral/interpreter/go
package main

import (
	"fmt"
	"strings"
)

type namedContext struct {
	name string
	ctx  Context
}

func main() {
	fmt.Println("=== Interpreter Pattern: Pricing rule expression language ===")

	contexts := []namedContext{
		{"regular", Context{"price": 20, "quantity": 3, "discount": 5, "shipping": 6, "taxRate": 0.21}},
		{"bulk", Context{"price": 12.5, "quantity": 10, "discount": 15, "shipping": 8, "taxRate": 0.1}},
	}
	// Go maps are unordered, so the variables are printed in an explicit order.
	keys := []string{"price", "quantity", "discount", "shipping", "taxRate"}

	for _, c := range contexts {
		vars := make([]string, len(keys))
		for i, k := range keys {
			vars[i] = k + "=" + formatNumber(c.ctx[k])
		}
		fmt.Printf("Context %-9s%s\n", c.name+":", strings.Join(vars, ", "))
	}

	// evaluate interprets one AST against every context. The tree is built once and reused.
	evaluate := func(ast Expression) {
		fmt.Printf("  %-9s%s\n", "AST:", ast)
		for _, c := range contexts {
			result := ""
			if v, err := ast.Interpret(c.ctx); err != nil {
				result = "error: " + err.Error()
			} else {
				result = fmt.Sprintf("%.2f", v)
			}
			fmt.Printf("  %-9s%s\n", c.name+":", result)
		}
	}

	// The AST types ARE the pattern: we can build a sentence by hand, no parser needed.
	fmt.Println("Hand-built AST (no parser): price * 0.9")
	evaluate(NewMultiply(Variable{"price"}, NumberLiteral{0.9}))

	rules := []string{
		"price * quantity - discount",
		"(price + shipping) * (1 + taxRate)",
		"price * quantity - discount - shipping / 2",
		"price * coupon",
		"(price + 1",
	}
	for _, rule := range rules {
		fmt.Printf("Rule: %s\n", rule)
		ast, err := Parse(rule)
		if err != nil {
			fmt.Printf("  syntax error: %s\n", err)
			continue
		}
		evaluate(ast)
	}
}
