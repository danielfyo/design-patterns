"""Strategy pattern: interchangeable shipping cost algorithms.

Run with:  python3 main.py
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class Order:
    """Immutable data the strategies need to compute a price."""

    subtotal: Decimal
    weight_kg: Decimal


class ShippingStrategy(Protocol):
    """The Strategy interface (structural typing: any object with these members fits)."""

    @property
    def name(self) -> str: ...

    def calculate(self, order: Order) -> Decimal: ...


class StandardShipping:
    """Concrete strategy: flat fee plus a per-kilogram rate."""

    name = "Standard"

    def calculate(self, order: Order) -> Decimal:
        return Decimal("5.00") + Decimal("1.50") * order.weight_kg


class ExpressShipping:
    """Concrete strategy: faster, so more expensive."""

    name = "Express"

    def calculate(self, order: Order) -> Decimal:
        return Decimal("15.00") + Decimal("3.00") * order.weight_kg


class FreeOverThresholdShipping:
    """Concrete strategy that composes another one: free above a threshold."""

    def __init__(self, threshold: Decimal, fallback: ShippingStrategy) -> None:
        self._threshold = threshold
        self._fallback = fallback
        self.name = f"Free over ${self._threshold:.0f}"

    def calculate(self, order: Order) -> Decimal:
        if order.subtotal >= self._threshold:
            return Decimal("0")
        return self._fallback.calculate(order)


class StorePickup:
    """Concrete strategy: the customer collects the parcel."""

    name = "Store pickup"

    def calculate(self, order: Order) -> Decimal:
        return Decimal("0")


class ShippingCalculator:
    """The Context: delegates the computation to the current strategy."""

    def __init__(self, strategy: ShippingStrategy) -> None:
        self.strategy = strategy

    def quote(self, order: Order) -> Decimal:
        return self.strategy.calculate(order)


def main() -> None:
    print("=== Strategy Pattern: Shipping cost calculator ===")

    strategies: list[ShippingStrategy] = [
        StandardShipping(),
        ExpressShipping(),
        FreeOverThresholdShipping(Decimal("100"), StandardShipping()),
        StorePickup(),
    ]
    orders = [Order(Decimal("80"), Decimal("4")), Order(Decimal("150"), Decimal("4"))]

    # The same calculator is reused; only the strategy changes at runtime.
    calculator = ShippingCalculator(strategies[0])

    for order in orders:
        print(f"Order: subtotal=${order.subtotal:.2f}, weight={order.weight_kg:.1f}kg")
        for strategy in strategies:
            calculator.strategy = strategy
            print(f"  {strategy.name:<16} -> ${calculator.quote(order):.2f}")


if __name__ == "__main__":
    main()
