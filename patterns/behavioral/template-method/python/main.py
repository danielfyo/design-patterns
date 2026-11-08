"""Template Method pattern: a data importer with a fixed skeleton.

Run with:  python3 main.py
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, replace
from decimal import Decimal
from typing import final


@dataclass(frozen=True)
class Product:
    """One product row, whatever the source format."""

    sku: str
    name: str
    price: Decimal


@dataclass(frozen=True)
class ImportSummary:
    """What the template reports to the on_complete hook."""

    read: int
    dropped: int
    saved: int
    total: Decimal


class DataImporter(ABC):
    """Abstract Class: ``import_data`` is the template method.

    (``import`` is a Python keyword, hence the name.) It fixes the order of the
    steps; subclasses implement ``parse`` and may override the hooks.
    """

    @final
    def import_data(self, raw: str) -> ImportSummary:
        """The template method. ``@final`` tells type checkers not to override it."""
        records = self.parse(raw)
        print(f"[parse] {len(records)} record(s) read")
        valid = self.validate(records)
        transformed = [self.transform(r) for r in valid]
        self._save(transformed)
        summary = ImportSummary(
            read=len(records),
            dropped=len(records) - len(valid),
            saved=len(transformed),
            total=sum((p.price for p in transformed), Decimal("0")),
        )
        self.on_complete(summary)
        return summary

    @abstractmethod
    def parse(self, raw: str) -> list[Product]:
        """Primitive operation: every format parses differently, so it is abstract."""

    def validate(self, records: list[Product]) -> list[Product]:
        """Overridable step with a sensible default: drop incomplete or wrong rows."""
        valid: list[Product] = []
        for r in records:
            if not r.name.strip():
                print(f"[validate] dropped {r.sku}: empty name")
            elif r.price < 0:
                print(f"[validate] dropped {r.sku}: negative price {r.price:.2f}")
            else:
                valid.append(r)
        return valid

    def transform(self, record: Product) -> Product:
        """Hook: identity by default."""
        return record

    @staticmethod
    def _save(records: list[Product]) -> None:
        """Common step shared by every importer (private by convention)."""
        for p in records:
            print(f"[save] {p.sku:<7} {p.name:<16} ${p.price:.2f}")

    def on_complete(self, s: ImportSummary) -> None:
        """Hook: called at the end with the summary; subclasses may extend it."""
        print(
            f"[complete] {s.read} read, {s.dropped} dropped, {s.saved} saved, total ${s.total:.2f}"
        )


class CsvImporter(DataImporter):
    """Concrete Class: parses "sku,name,price" lines and extends the completion hook."""

    def parse(self, raw: str) -> list[Product]:
        lines = raw.strip().splitlines()[1:]  # skip the header
        products: list[Product] = []
        for line in lines:
            sku, name, price = line.strip().split(",")
            products.append(Product(sku, name, Decimal(price)))
        return products

    def on_complete(self, s: ImportSummary) -> None:
        super().on_complete(s)
        print("[notify] import report sent to the catalog team")


class JsonImporter(DataImporter):
    """Concrete Class: parses a JSON array and overrides the transform hook."""

    def parse(self, raw: str) -> list[Product]:
        rows = json.loads(raw, parse_float=Decimal)
        return [Product(row["sku"], row["name"], Decimal(row["price"])) for row in rows]

    def transform(self, record: Product) -> Product:
        upper = record.sku.upper()
        print(f"[transform] {record.sku} -> {upper}")
        return replace(record, sku=upper)


CSV_SAMPLE = """
sku,name,price
bk-001,Clean Code,32.50
bk-002,,18.00
bk-003,Refactoring,-5.00
bk-004,Design Patterns,45.00
"""

JSON_SAMPLE = """
[
  {"sku": "el-100", "name": "USB-C cable", "price": 9.99},
  {"sku": "el-200", "name": "Headphones", "price": 59.90},
  {"sku": "el-300", "name": "", "price": 12.00}
]
"""


def main() -> None:
    print("=== Template Method Pattern: Data importer ===")

    # The client calls the same template method; each subclass fills in different steps.
    print("--- CsvImporter ---")
    CsvImporter().import_data(CSV_SAMPLE)

    print("--- JsonImporter ---")
    JsonImporter().import_data(JSON_SAMPLE)


if __name__ == "__main__":
    main()
