"""Iterator pattern: walk a paginated API one product at a time.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal
from itertools import islice


@dataclass(frozen=True)
class Product:
    """An item of the collection we iterate over."""

    id: int
    name: str
    price: Decimal


@dataclass(frozen=True)
class Page:
    """One page of results, as a paginated REST API would return it."""

    items: tuple[Product, ...]
    has_more: bool


class ProductApi:
    """A fake remote API that returns products page by page
    (think ``GET /products?page=2&size=3``)."""

    _PRODUCTS = (
        Product(1, "Keyboard", Decimal("49.99")),
        Product(2, "Mouse", Decimal("19.99")),
        Product(3, "Monitor", Decimal("189.00")),
        Product(4, "Webcam", Decimal("59.50")),
        Product(5, "Headset", Decimal("79.90")),
        Product(6, "USB hub", Decimal("24.00")),
        Product(7, "Desk lamp", Decimal("34.75")),
    )

    def __init__(self) -> None:
        self.request_count = 0

    def get_page(self, page_number: int, page_size: int) -> Page:
        """Return page ``page_number`` (1-based)."""
        self.request_count += 1
        print(f"[api] fetching page {page_number}")
        start = (page_number - 1) * page_size
        return Page(
            items=self._PRODUCTS[start : start + page_size],
            has_more=start + page_size < len(self._PRODUCTS),
        )


class ProductIterator(ABC):
    """The Iterator interface in its classic GoF shape."""

    @abstractmethod
    def has_next(self) -> bool: ...

    @abstractmethod
    def next(self) -> Product: ...


class PagedProductIterator(ProductIterator):
    """Concrete Iterator: walks the products one by one and fetches the next page
    only when the current one is exhausted. Clients never see pages."""

    def __init__(self, api: ProductApi, page_size: int) -> None:
        self._api = api
        self._page_size = page_size
        self._buffer: tuple[Product, ...] = ()
        self._index = 0
        self._page_number = 0
        self._has_more = True

    def has_next(self) -> bool:
        if self._index < len(self._buffer):
            return True
        if not self._has_more:
            return False
        self._page_number += 1
        page = self._api.get_page(self._page_number, self._page_size)
        self._buffer = page.items
        self._has_more = page.has_more
        self._index = 0
        return len(self._buffer) > 0

    def next(self) -> Product:
        if not self.has_next():
            raise StopIteration("No more products.")
        product = self._buffer[self._index]
        self._index += 1
        return product


class ProductCatalog:
    """Aggregate: the collection that hands out iterators. It offers both the
    explicit GoF iterator and the idiomatic Python form (``__iter__``)."""

    def __init__(self, api: ProductApi, page_size: int) -> None:
        self._api = api
        self._page_size = page_size

    def create_iterator(self) -> ProductIterator:
        """Factory method for the explicit iterator."""
        return PagedProductIterator(self._api, self._page_size)

    def __iter__(self) -> Iterator[Product]:
        """Idiomatic Python: a generator. ``yield`` suspends the function, so pages
        are fetched lazily, one item per ``next()`` call."""
        page_number = 1
        while True:
            page = self._api.get_page(page_number, self._page_size)
            yield from page.items
            if not page.has_more:
                return
            page_number += 1


def print_product(p: Product) -> None:
    print(f"  #{p.id} {p.name:<10} ${p.price:.2f}")


def main() -> None:
    print("=== Iterator Pattern: Paginated API results ===")

    # 1) The classic GoF iterator: the client only knows has_next()/next().
    print("1) Explicit iterator: hasNext() / next()")
    api = ProductApi()
    iterator = ProductCatalog(api, page_size=3).create_iterator()
    count = 0
    while iterator.has_next():
        print_product(iterator.next())
        count += 1
    print(f"Done: {count} products, {api.request_count} requests")

    # 2) The idiomatic form: a for loop over an iterable. Because the generator is
    #    lazy, islice() stops pulling after 4 items and page 3 is never requested.
    print("2) Idiomatic loop, stopping after 4 products")
    api = ProductApi()
    count = 0
    for product in islice(ProductCatalog(api, page_size=3), 4):
        print_product(product)
        count += 1
    print(f"Done: {count} products, {api.request_count} requests (page 3 was never fetched)")


if __name__ == "__main__":
    main()
