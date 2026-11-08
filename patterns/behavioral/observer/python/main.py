"""Observer pattern: a stock ticker notifies its subscribers of price changes.

Run with:  python3 main.py
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from decimal import Decimal
from typing import Protocol


class StockObserver(Protocol):
    """The Observer interface: anything that wants to hear about price changes."""

    def update(self, symbol: str, price: Decimal) -> None: ...


class StockTicker:
    """The Subject: keeps the latest prices and a list of observers, and notifies
    all of them whenever a price changes. It knows nothing about what they do."""

    def __init__(self) -> None:
        self._observers: list[StockObserver] = []
        self._prices: dict[str, Decimal] = {}

    def subscribe(self, observer: StockObserver) -> Callable[[], None]:
        """Subscribe an observer and return a function that unsubscribes it."""
        self._observers.append(observer)
        return lambda: self.unsubscribe(observer)

    def unsubscribe(self, observer: StockObserver) -> None:
        if observer in self._observers:
            self._observers.remove(observer)

    def get_price(self, symbol: str) -> Decimal | None:
        return self._prices.get(symbol)

    def set_price(self, symbol: str, price: Decimal) -> None:
        self._prices[symbol] = price
        print(f"[ticker] {symbol} = ${price:.2f} (notifying {len(self._observers)} observers)")
        self._notify(symbol, price)

    def _notify(self, symbol: str, price: Decimal) -> None:
        # Iterate over a copy so observers may unsubscribe while being notified.
        for observer in list(self._observers):
            observer.update(symbol, price)


class PriceDisplay:
    """Concrete Observer: shows every price it receives."""

    def update(self, symbol: str, price: Decimal) -> None:
        print(f"  [display] {symbol}: ${price:.2f}")


class PriceAlert:
    """Concrete Observer: reacts only when one symbol goes above a threshold."""

    def __init__(self, symbol: str, threshold: Decimal) -> None:
        self.symbol = symbol
        self.threshold = threshold

    def update(self, symbol: str, price: Decimal) -> None:
        if symbol == self.symbol and price > self.threshold:
            print(f"  [alert] {symbol} is above ${self.threshold:.2f}: now ${price:.2f}")


class PortfolioTracker:
    """Concrete Observer with its own state: remembers the last price of each
    holding and recomputes the portfolio value when one of them changes."""

    def __init__(self, holdings: Mapping[str, int]) -> None:
        self._holdings = dict(holdings)
        self._last_prices: dict[str, Decimal] = {}

    @property
    def value(self) -> Decimal:
        return sum(
            (self._last_prices.get(symbol, Decimal("0")) * shares for symbol, shares in self._holdings.items()),
            Decimal("0"),
        )

    def update(self, symbol: str, price: Decimal) -> None:
        if symbol not in self._holdings:
            return
        self._last_prices[symbol] = price
        print(f"  [portfolio] value: ${self.value:.2f}")


def main() -> None:
    print("=== Observer Pattern: Stock price ticker ===")

    ticker = StockTicker()

    # The subject only knows the StockObserver protocol.
    unsubscribe_display = ticker.subscribe(PriceDisplay())
    ticker.subscribe(PriceAlert("AAPL", Decimal("200.00")))
    ticker.subscribe(PortfolioTracker({"AAPL": 10, "MSFT": 5}))

    ticker.set_price("AAPL", Decimal("195.50"))
    ticker.set_price("MSFT", Decimal("410.20"))
    ticker.set_price("AAPL", Decimal("201.25"))

    unsubscribe_display()
    print("-- display unsubscribed --")

    ticker.set_price("AAPL", Decimal("203.10"))
    ticker.set_price("GOOG", Decimal("172.40"))  # nobody cares about GOOG: no reactions
    ticker.set_price("MSFT", Decimal("398.00"))


if __name__ == "__main__":
    main()
