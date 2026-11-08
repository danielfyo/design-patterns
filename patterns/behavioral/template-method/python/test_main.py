"""Tests for the Template Method example: the fixed skeleton and each overridden step."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def recording_importer(example: ModuleType, *products: Any) -> Any:
    """Build a subclass that records the order in which the template calls each step."""

    class RecordingImporter(example.DataImporter):  # type: ignore[misc,name-defined]
        def __init__(self) -> None:
            self.calls: list[str] = []

        def parse(self, raw: str) -> list[Any]:
            self.calls.append("parse")
            return list(products)

        def validate(self, records: list[Any]) -> list[Any]:
            self.calls.append("validate")
            result: list[Any] = super().validate(records)
            return result

        def transform(self, record: Any) -> Any:
            self.calls.append(f"transform {record.sku}")
            return record

        def on_complete(self, s: Any) -> None:
            self.calls.append("complete")

    return RecordingImporter()


def test_template_calls_the_steps_in_a_fixed_order(example: ModuleType) -> None:
    importer = recording_importer(
        example,
        example.Product("a", "A", Decimal("1")),
        example.Product("b", "B", Decimal("2")),
    )

    importer.import_data("ignored")

    assert importer.calls == ["parse", "validate", "transform a", "transform b", "complete"]


def test_csv_importer_drops_invalid_rows_and_summarises_the_rest(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    summary = example.CsvImporter().import_data(example.CSV_SAMPLE)

    assert summary == example.ImportSummary(read=4, dropped=2, saved=2, total=Decimal("77.50"))
    out = capsys.readouterr().out
    assert "[validate] dropped bk-002: empty name" in out
    assert "[validate] dropped bk-003: negative price -5.00" in out


def test_csv_importer_extends_the_completion_hook_after_the_default(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.CsvImporter().import_data(example.CSV_SAMPLE)

    lines = capsys.readouterr().out.splitlines()
    assert lines[-2].startswith("[complete] ")
    assert lines[-1] == "[notify] import report sent to the catalog team"


def test_json_importer_overrides_the_transform_hook(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    summary = example.JsonImporter().import_data(example.JSON_SAMPLE)

    assert summary == example.ImportSummary(read=3, dropped=1, saved=2, total=Decimal("69.89"))
    out = capsys.readouterr().out
    assert "[transform] el-100 -> EL-100" in out
    assert "[save] EL-200 " in out
    assert "[notify]" not in out


def test_default_validation_treats_a_whitespace_name_as_empty(example: ModuleType) -> None:
    importer = recording_importer(
        example,
        example.Product("x", "   ", Decimal("1")),
        example.Product("y", "Y", Decimal("0")),
    )

    summary = importer.import_data("ignored")

    assert summary == example.ImportSummary(read=2, dropped=1, saved=1, total=Decimal("0"))


def test_importing_nothing_yields_an_empty_summary(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    summary = example.CsvImporter().import_data("sku,name,price")

    assert summary == example.ImportSummary(read=0, dropped=0, saved=0, total=Decimal("0"))
    assert capsys.readouterr().out.startswith("[parse] 0 record(s) read\n[complete] 0 read")


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
