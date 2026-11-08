package main

// Helper (not part of the pattern itself): a tokenizer and a recursive-descent
// parser that turn source text into an AST of Expression values.
//
// Grammar, from lowest to highest precedence (all operators are left-associative):
//
//	expression := term (('+' | '-') term)*
//	term       := factor (('*' | '/') factor)*
//	factor     := NUMBER | IDENTIFIER | '(' expression ')'

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

type tokenKind int

const (
	tokNumber tokenKind = iota
	tokIdentifier
	tokSymbol
	tokEnd
)

type token struct {
	kind     tokenKind
	text     string
	position int
}

func (t token) describe() string {
	if t.kind == tokEnd {
		return "end of input"
	}
	return "'" + t.text + "'"
}

func isDigit(c byte) bool  { return c >= '0' && c <= '9' }
func isLetter(c byte) bool { return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c == '_' }

func tokenize(src string) ([]token, error) {
	var tokens []token
	i := 0
	for i < len(src) {
		c := src[i]
		start := i
		switch {
		case c == ' ' || c == '\t' || c == '\n' || c == '\r':
			i++
		case isDigit(c) || c == '.':
			for i < len(src) && (isDigit(src[i]) || src[i] == '.') {
				i++
			}
			tokens = append(tokens, token{tokNumber, src[start:i], start})
		case isLetter(c):
			for i < len(src) && (isLetter(src[i]) || isDigit(src[i])) {
				i++
			}
			tokens = append(tokens, token{tokIdentifier, src[start:i], start})
		case strings.IndexByte("+-*/()", c) >= 0:
			tokens = append(tokens, token{tokSymbol, string(c), start})
			i++
		default:
			return nil, fmt.Errorf("unexpected character '%c' at position %d", c, start)
		}
	}
	return append(tokens, token{tokEnd, "", len(src)}), nil
}

var numberPattern = regexp.MustCompile(`^(\d+\.?\d*|\.\d+)$`)

type parser struct {
	tokens []token
	index  int
}

// Parse turns source text into an AST, or returns a syntax error.
func Parse(src string) (Expression, error) {
	tokens, err := tokenize(src)
	if err != nil {
		return nil, err
	}
	p := &parser{tokens: tokens}
	expr, err := p.expression()
	if err != nil {
		return nil, err
	}
	if p.peek().kind != tokEnd {
		return nil, fmt.Errorf("expected end of input but found %s", p.peek().describe())
	}
	return expr, nil
}

func (p *parser) peek() token { return p.tokens[p.index] }

func (p *parser) accept(symbol string) bool {
	if t := p.peek(); t.kind != tokSymbol || t.text != symbol {
		return false
	}
	p.index++
	return true
}

// expression := term (('+' | '-') term)*
// The loop builds the tree from the left, which makes the operators left-associative.
func (p *parser) expression() (Expression, error) {
	left, err := p.term()
	for err == nil {
		var right Expression
		switch {
		case p.accept("+"):
			right, err = p.term()
			left = NewAdd(left, right)
		case p.accept("-"):
			right, err = p.term()
			left = NewSubtract(left, right)
		default:
			return left, nil
		}
	}
	return nil, err
}

// term := factor (('*' | '/') factor)*
func (p *parser) term() (Expression, error) {
	left, err := p.factor()
	for err == nil {
		var right Expression
		switch {
		case p.accept("*"):
			right, err = p.factor()
			left = NewMultiply(left, right)
		case p.accept("/"):
			right, err = p.factor()
			left = NewDivide(left, right)
		default:
			return left, nil
		}
	}
	return nil, err
}

// factor := NUMBER | IDENTIFIER | '(' expression ')'
func (p *parser) factor() (Expression, error) {
	t := p.peek()
	switch t.kind {
	case tokNumber:
		p.index++
		if !numberPattern.MatchString(t.text) {
			return nil, fmt.Errorf("invalid number '%s' at position %d", t.text, t.position)
		}
		v, err := strconv.ParseFloat(t.text, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number '%s' at position %d", t.text, t.position)
		}
		return NumberLiteral{v}, nil
	case tokIdentifier:
		p.index++
		return Variable{t.text}, nil
	}
	if p.accept("(") {
		inner, err := p.expression()
		if err != nil {
			return nil, err
		}
		if !p.accept(")") {
			return nil, fmt.Errorf("expected ')' but found %s", p.peek().describe())
		}
		return inner, nil
	}
	return nil, fmt.Errorf("expected a number, variable or '(' but found %s", t.describe())
}
