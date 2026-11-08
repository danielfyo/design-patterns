"""Tests for the Interpreter example: the AST classes, then the parser and its errors."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REGULAR = {"price": 20, "quantity": 3, "discount": 5, "shipping": 6, "taxRate": 0.21}


def regular(example: ModuleType) -> Any:
    return example.Context(REGULAR)


def test_a_hand_built_ast_is_interpreted_without_a_parser(example: ModuleType) -> None:
    ast = example.Multiply(example.Variable("price"), example.NumberLiteral(0.9))

    assert ast.interpret(regular(example)) == pytest.approx(18.0)
    assert str(ast) == "(price * 0.9)"


@pytest.mark.parametrize(
    ("source", "ast", "value"),
    [
        ("1 + 2 * 3", "(1 + (2 * 3))", 7),
        ("(1 + 2) * 3", "((1 + 2) * 3)", 9),
        ("10 - 4 - 3", "((10 - 4) - 3)", 3),
        ("24 / 4 / 2", "((24 / 4) / 2)", 3),
        ("price * quantity - discount", "((price * quantity) - discount)", 55),
    ],
)
def test_parser_respects_precedence_and_left_associativity(
    example: ModuleType, source: str, ast: str, value: float
) -> None:
    expression = example.Parser.parse(source)

    assert str(expression) == ast
    assert expression.interpret(regular(example)) == pytest.approx(value)


def test_the_same_ast_is_reinterpreted_against_different_contexts(example: ModuleType) -> None:
    ast = example.Parser.parse("(price + shipping) * (1 + taxRate)")
    bulk = example.Context({"price": 12.5, "shipping": 8, "taxRate": 0.1})

    assert ast.interpret(regular(example)) == pytest.approx(31.46)
    assert ast.interpret(bulk) == pytest.approx(22.55)


def test_unknown_variable_is_an_evaluation_error(example: ModuleType) -> None:
    ast = example.Parser.parse("price * coupon")

    with pytest.raises(example.ExpressionError, match=r"^unknown variable 'coupon'$"):
        ast.interpret(regular(example))


def test_division_by_zero_is_checked_before_the_dividend(example: ModuleType) -> None:
    ast = example.Parser.parse("coupon / (quantity - 3)")

    with pytest.raises(example.ExpressionError, match=r"^division by zero$"):
        ast.interpret(regular(example))


@pytest.mark.parametrize(
    ("source", "message"),
    [
        ("(price + 1", "expected ')' but found end of input"),
        ("price +", "expected a number, variable or '(' but found end of input"),
        ("price price", "expected end of input but found 'price'"),
        ("price % 2", "unexpected character '%' at position 6"),
        ("1.2.3", "invalid number '1.2.3' at position 0"),
    ],
)
def test_syntax_errors_are_reported_with_a_clear_message(
    example: ModuleType, source: str, message: str
) -> None:
    with pytest.raises(example.ExpressionError) as error:
        example.Parser.parse(source)

    assert str(error.value) == message


@pytest.mark.parametrize(("value", "expected"), [(2, "2"), (0.21, "0.21"), (12.5, "12.5")])
def test_numbers_are_printed_in_their_shortest_form(
    example: ModuleType, value: float, expected: str
) -> None:
    assert example.format_number(value) == expected


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
