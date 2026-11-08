"""Interpreter pattern: a tiny pricing-rule expression language.

Run with:  python3 main.py
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal


class ExpressionError(Exception):
    """Raised for syntax errors (parser) and evaluation errors (interpreter)."""


class Context:
    """Context: the global information expressions are interpreted against (variable values)."""

    def __init__(self, variables: Mapping[str, float]) -> None:
        self.variables = variables

    def lookup(self, name: str) -> float:
        if name not in self.variables:
            raise ExpressionError(f"unknown variable '{name}'")
        return self.variables[name]


def format_number(value: float) -> str:
    """Shortest round-trip form: 2, 0.21, 12.5 (identical in every language of the repo)."""
    return str(int(value)) if float(value).is_integer() else repr(float(value))


# --- The pattern: one class per grammar rule ---------------------------------


class Expression(ABC):
    """Abstract Expression: interpreting a sentence means calling ``interpret`` on
    the root of its AST. ``str()`` prints the AST in a fully parenthesized form."""

    @abstractmethod
    def interpret(self, context: Context) -> float: ...


@dataclass(frozen=True)
class NumberLiteral(Expression):
    """Terminal Expression: a numeric literal such as ``2`` or ``0.9``."""

    value: float

    def interpret(self, context: Context) -> float:
        return self.value

    def __str__(self) -> str:
        return format_number(self.value)


@dataclass(frozen=True)
class Variable(Expression):
    """Terminal Expression: a variable resolved through the context."""

    name: str

    def interpret(self, context: Context) -> float:
        return context.lookup(self.name)

    def __str__(self) -> str:
        return self.name


@dataclass(frozen=True)
class BinaryExpression(Expression):
    """Shared shape of the Nonterminal Expressions: two sub-expressions and an
    operator symbol. Each subclass interprets its children and combines them."""

    left: Expression
    right: Expression
    symbol = "?"  # class attribute overridden by each subclass (not a dataclass field)

    def __str__(self) -> str:
        return f"({self.left} {self.symbol} {self.right})"


class Add(BinaryExpression):
    """Nonterminal Expression: ``left + right``."""

    symbol = "+"

    def interpret(self, context: Context) -> float:
        return self.left.interpret(context) + self.right.interpret(context)


class Subtract(BinaryExpression):
    """Nonterminal Expression: ``left - right``."""

    symbol = "-"

    def interpret(self, context: Context) -> float:
        return self.left.interpret(context) - self.right.interpret(context)


class Multiply(BinaryExpression):
    """Nonterminal Expression: ``left * right``."""

    symbol = "*"

    def interpret(self, context: Context) -> float:
        return self.left.interpret(context) * self.right.interpret(context)


class Divide(BinaryExpression):
    """Nonterminal Expression: ``left / right`` (division by zero is an error)."""

    symbol = "/"

    def interpret(self, context: Context) -> float:
        divisor = self.right.interpret(context)
        if divisor == 0:
            raise ExpressionError("division by zero")
        return self.left.interpret(context) / divisor


# --- Helper (not part of the pattern): tokenizer + recursive-descent parser --
#
# Grammar, from lowest to highest precedence (all operators are left-associative):
#   expression := term (('+' | '-') term)*
#   term       := factor (('*' | '/') factor)*
#   factor     := NUMBER | IDENTIFIER | '(' expression ')'

TokenKind = Literal["number", "identifier", "symbol", "end"]


@dataclass(frozen=True)
class Token:
    kind: TokenKind
    text: str
    position: int

    def describe(self) -> str:
        return "end of input" if self.kind == "end" else f"'{self.text}'"


def tokenize(source: str) -> list[Token]:
    tokens: list[Token] = []
    i = 0
    while i < len(source):
        c = source[i]
        if c.isspace():
            i += 1
            continue
        start = i
        if c.isascii() and (c.isdigit() or c == "."):
            while i < len(source) and source[i].isascii() and (source[i].isdigit() or source[i] == "."):
                i += 1
            tokens.append(Token("number", source[start:i], start))
        elif c.isascii() and (c.isalpha() or c == "_"):
            while i < len(source) and source[i].isascii() and (source[i].isalnum() or source[i] == "_"):
                i += 1
            tokens.append(Token("identifier", source[start:i], start))
        elif c in "+-*/()":
            tokens.append(Token("symbol", c, start))
            i += 1
        else:
            raise ExpressionError(f"unexpected character '{c}' at position {start}")
    tokens.append(Token("end", "", len(source)))
    return tokens


class Parser:
    """Turns source text into an AST of Expression objects."""

    _NUMBER = re.compile(r"\d+\.?\d*|\.\d+")

    def __init__(self, tokens: list[Token]) -> None:
        self._tokens = tokens
        self._index = 0

    @classmethod
    def parse(cls, source: str) -> Expression:
        parser = cls(tokenize(source))
        expression = parser._parse_expression()
        if parser._peek.kind != "end":
            raise ExpressionError(f"expected end of input but found {parser._peek.describe()}")
        return expression

    @property
    def _peek(self) -> Token:
        return self._tokens[self._index]

    def _accept(self, symbol: str) -> bool:
        if self._peek.kind != "symbol" or self._peek.text != symbol:
            return False
        self._index += 1
        return True

    # expression := term (('+' | '-') term)*   -- the loop makes it left-associative
    def _parse_expression(self) -> Expression:
        left = self._parse_term()
        while True:
            if self._accept("+"):
                left = Add(left, self._parse_term())
            elif self._accept("-"):
                left = Subtract(left, self._parse_term())
            else:
                return left

    # term := factor (('*' | '/') factor)*
    def _parse_term(self) -> Expression:
        left = self._parse_factor()
        while True:
            if self._accept("*"):
                left = Multiply(left, self._parse_factor())
            elif self._accept("/"):
                left = Divide(left, self._parse_factor())
            else:
                return left

    # factor := NUMBER | IDENTIFIER | '(' expression ')'
    def _parse_factor(self) -> Expression:
        token = self._peek
        if token.kind == "number":
            self._index += 1
            if not self._NUMBER.fullmatch(token.text):
                raise ExpressionError(f"invalid number '{token.text}' at position {token.position}")
            return NumberLiteral(float(token.text))
        if token.kind == "identifier":
            self._index += 1
            return Variable(token.text)
        if self._accept("("):
            inner = self._parse_expression()
            if not self._accept(")"):
                raise ExpressionError(f"expected ')' but found {self._peek.describe()}")
            return inner
        raise ExpressionError(f"expected a number, variable or '(' but found {token.describe()}")


# --- Client ------------------------------------------------------------------


def main() -> None:
    print("=== Interpreter Pattern: Pricing rule expression language ===")

    contexts = {
        "regular": Context({"price": 20, "quantity": 3, "discount": 5, "shipping": 6, "taxRate": 0.21}),
        "bulk": Context({"price": 12.5, "quantity": 10, "discount": 15, "shipping": 8, "taxRate": 0.1}),
    }

    for name, context in contexts.items():
        variables = ", ".join(f"{k}={format_number(v)}" for k, v in context.variables.items())
        print(f"Context {name + ':':<9}{variables}")

    def evaluate(ast: Expression) -> None:
        """Evaluate one AST against every context. The tree is built once and reused."""
        print(f"  {'AST:':<9}{ast}")
        for name, context in contexts.items():
            try:
                result = f"{ast.interpret(context):.2f}"
            except ExpressionError as e:
                result = f"error: {e}"
            print(f"  {name + ':':<9}{result}")

    # The AST classes ARE the pattern: we can build a sentence by hand, no parser needed.
    print("Hand-built AST (no parser): price * 0.9")
    evaluate(Multiply(Variable("price"), NumberLiteral(0.9)))

    rules = [
        "price * quantity - discount",
        "(price + shipping) * (1 + taxRate)",
        "price * quantity - discount - shipping / 2",
        "price * coupon",
        "(price + 1",
    ]
    for rule in rules:
        print(f"Rule: {rule}")
        try:
            ast = Parser.parse(rule)
        except ExpressionError as e:
            print(f"  syntax error: {e}")
            continue
        evaluate(ast)


if __name__ == "__main__":
    main()
