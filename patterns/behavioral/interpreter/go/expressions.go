package main

import (
	"errors"
	"fmt"
	"strconv"
)

// Context holds the global information expressions are interpreted against:
// the values of the variables.
type Context map[string]float64

// Lookup returns a variable's value, or an error if it is not defined.
func (c Context) Lookup(name string) (float64, error) {
	v, ok := c[name]
	if !ok {
		return 0, fmt.Errorf("unknown variable '%s'", name)
	}
	return v, nil
}

// formatNumber prints the shortest round-trip form: 2, 0.21, 12.5
// (identical in every language of the repo).
func formatNumber(v float64) string { return strconv.FormatFloat(v, 'f', -1, 64) }

// Expression is the Abstract Expression: one type per grammar rule implements
// it. Interpreting a sentence means calling Interpret on the root of its AST.
// String prints the AST in a fully parenthesized canonical form.
type Expression interface {
	Interpret(ctx Context) (float64, error)
	String() string
}

// NumberLiteral is a Terminal Expression: a numeric literal such as 2 or 0.9.
type NumberLiteral struct{ Value float64 }

func (n NumberLiteral) Interpret(Context) (float64, error) { return n.Value, nil }
func (n NumberLiteral) String() string                     { return formatNumber(n.Value) }

// Variable is a Terminal Expression: a variable resolved through the context.
type Variable struct{ Name string }

func (v Variable) Interpret(ctx Context) (float64, error) { return ctx.Lookup(v.Name) }
func (v Variable) String() string                         { return v.Name }

// binary is the shared shape of the Nonterminal Expressions: two
// sub-expressions. Each concrete type embeds it and combines the results.
type binary struct {
	Left, Right Expression
}

// operands interprets both children, stopping at the first error.
func (b binary) operands(ctx Context) (float64, float64, error) {
	l, err := b.Left.Interpret(ctx)
	if err != nil {
		return 0, 0, err
	}
	r, err := b.Right.Interpret(ctx)
	return l, r, err
}

func (b binary) format(symbol string) string {
	return fmt.Sprintf("(%s %s %s)", b.Left, symbol, b.Right)
}

// Add is a Nonterminal Expression: left + right.
type Add struct{ binary }

func (e Add) Interpret(ctx Context) (float64, error) {
	l, r, err := e.operands(ctx)
	return l + r, err
}
func (e Add) String() string { return e.format("+") }

// Subtract is a Nonterminal Expression: left - right.
type Subtract struct{ binary }

func (e Subtract) Interpret(ctx Context) (float64, error) {
	l, r, err := e.operands(ctx)
	return l - r, err
}
func (e Subtract) String() string { return e.format("-") }

// Multiply is a Nonterminal Expression: left * right.
type Multiply struct{ binary }

func (e Multiply) Interpret(ctx Context) (float64, error) {
	l, r, err := e.operands(ctx)
	return l * r, err
}
func (e Multiply) String() string { return e.format("*") }

// Divide is a Nonterminal Expression: left / right (division by zero is an error).
type Divide struct{ binary }

func (e Divide) Interpret(ctx Context) (float64, error) {
	l, r, err := e.operands(ctx)
	if err != nil {
		return 0, err
	}
	if r == 0 {
		return 0, errors.New("division by zero")
	}
	return l / r, nil
}
func (e Divide) String() string { return e.format("/") }

// Constructors keep AST building readable: NewMultiply(Variable{"price"}, NumberLiteral{0.9}).
func NewAdd(l, r Expression) Expression      { return Add{binary{l, r}} }
func NewSubtract(l, r Expression) Expression { return Subtract{binary{l, r}} }
func NewMultiply(l, r Expression) Expression { return Multiply{binary{l, r}} }
func NewDivide(l, r Expression) Expression   { return Divide{binary{l, r}} }
