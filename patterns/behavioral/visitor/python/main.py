"""Visitor pattern: tax, shipping and receipt operations over cart items.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol


def round2(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def money(amount: Decimal) -> str:
    return f"${amount:.2f}"


@dataclass(frozen=True)
class CartItem(ABC):
    """Element: every cart item can accept a visitor (first half of double dispatch)."""

    name: str
    price: Decimal
    weight_kg: Decimal

    @abstractmethod
    def accept(self, visitor: CartVisitor) -> None: ...


@dataclass(frozen=True)
class Book(CartItem):
    """Concrete Element: calls the visitor method that matches its own type."""

    def accept(self, visitor: CartVisitor) -> None:
        visitor.visit_book(self)


@dataclass(frozen=True)
class Electronics(CartItem):
    """Concrete Element."""

    def accept(self, visitor: CartVisitor) -> None:
        visitor.visit_electronics(self)


@dataclass(frozen=True)
class Food(CartItem):
    """Concrete Element."""

    def accept(self, visitor: CartVisitor) -> None:
        visitor.visit_food(self)


class CartVisitor(Protocol):
    """Visitor: one method per element type (second half of double dispatch)."""

    def visit_book(self, book: Book) -> None: ...

    def visit_electronics(self, electronics: Electronics) -> None: ...

    def visit_food(self, food: Food) -> None: ...


class ReceiptPrinter:
    """Concrete Visitor: prints one receipt line per item and sums the subtotal."""

    def __init__(self) -> None:
        self.total = Decimal("0")

    def visit_book(self, book: Book) -> None:
        self._print("[Book]", book)

    def visit_electronics(self, electronics: Electronics) -> None:
        self._print("[Electronics]", electronics)

    def visit_food(self, food: Food) -> None:
        self._print("[Food]", food)

    def _print(self, label: str, item: CartItem) -> None:
        print(f"  {label:<13} {item.name:<14} {money(item.price):>8}  {item.weight_kg:.2f}kg")
        self.total += item.price


class TaxCalculator:
    """Concrete Visitor: VAT depends on the kind of product."""

    def __init__(self) -> None:
        self.total = Decimal("0")

    def visit_book(self, book: Book) -> None:
        self._apply(book, "books 4%", Decimal("0.04"))

    def visit_electronics(self, electronics: Electronics) -> None:
        self._apply(electronics, "electronics 21%", Decimal("0.21"))

    def visit_food(self, food: Food) -> None:
        self._apply(food, "food 10%", Decimal("0.10"))

    def _apply(self, item: CartItem, label: str, rate: Decimal) -> None:
        tax = round2(item.price * rate)
        print(f"  {item.name:<14} {label:<17} {money(tax):>8}")
        self.total += tax


class ShippingCostCalculator:
    """Concrete Visitor: shipping rules by product type and weight."""

    def __init__(self) -> None:
        self.total = Decimal("0")

    def visit_book(self, book: Book) -> None:
        self._add(book, "flat rate", Decimal("1.50"))

    def visit_electronics(self, electronics: Electronics) -> None:
        self._add(electronics, "$4.00 + $1.20/kg", Decimal("4.00") + Decimal("1.20") * electronics.weight_kg)

    def visit_food(self, food: Food) -> None:
        self._add(food, "$2.50/kg, min $3.00", max(Decimal("3.00"), Decimal("2.50") * food.weight_kg))

    def _add(self, item: CartItem, rule: str, cost: Decimal) -> None:
        cost = round2(cost)
        print(f"  {item.name:<14} {rule:<20} {money(cost):>8}")
        self.total += cost


def main() -> None:
    print("=== Visitor Pattern: Shopping cart: tax & shipping ===")

    cart: list[CartItem] = [
        Book("Clean Code", Decimal("32.50"), Decimal("0.80")),
        Electronics("Headphones", Decimal("59.90"), Decimal("0.40")),
        Food("Coffee beans", Decimal("12.00"), Decimal("1.50")),
        Electronics("Monitor", Decimal("199.00"), Decimal("5.50")),
        Food("Chocolate", Decimal("3.50"), Decimal("0.20")),
    ]

    # The traversal is always the same; each visitor is a different operation.
    def visit(visitor: CartVisitor) -> None:
        for item in cart:
            item.accept(visitor)

    print("--- ReceiptPrinter ---")
    receipt = ReceiptPrinter()
    visit(receipt)
    print(f"  Subtotal: {money(receipt.total)}")

    print("--- TaxCalculator ---")
    tax = TaxCalculator()
    visit(tax)
    print(f"  Total tax: {money(tax.total)}")

    print("--- ShippingCostCalculator ---")
    shipping = ShippingCostCalculator()
    visit(shipping)
    print(f"  Total shipping: {money(shipping.total)}")

    grand = receipt.total + tax.total + shipping.total
    print(
        f"Grand total: {money(receipt.total)} + {money(tax.total)} tax"
        f" + {money(shipping.total)} shipping = {money(grand)}"
    )


if __name__ == "__main__":
    main()
