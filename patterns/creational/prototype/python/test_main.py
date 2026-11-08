"""Tests for the Prototype example: deep vs shallow copies and the template registry."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPORT_TEXT = (
    "Quarterly Report | Times 12pt | sections=[Summary, Findings] | "
    "metadata={owner=analytics, status=template}"
)


def new_report(example: ModuleType) -> Any:
    return example.Document(
        "Quarterly Report",
        ["Summary", "Findings"],
        {"status": "template", "owner": "analytics"},
        example.Style("Times", 12),
    )


def test_clone_copies_every_value(example: ModuleType) -> None:
    original = new_report(example)

    clone = original.clone()

    assert str(clone) == REPORT_TEXT
    assert clone == original


def test_clone_is_deep_and_shares_no_mutable_state(example: ModuleType) -> None:
    original = new_report(example)

    clone = original.clone()

    assert clone.sections is not original.sections
    assert clone.metadata is not original.metadata
    assert clone.style is not original.style


def test_mutating_a_clone_leaves_the_original_intact(example: ModuleType) -> None:
    original = new_report(example)
    clone = original.clone()

    clone.title = "Draft"
    clone.sections[0] = "Cover page"
    clone.sections.append("Appendix")
    clone.metadata["status"] = "edited"
    clone.style.font = "Georgia"
    clone.style.size_pt = 9

    assert str(original) == REPORT_TEXT
    assert str(clone) == (
        "Draft | Georgia 9pt | sections=[Cover page, Findings, Appendix] | "
        "metadata={owner=analytics, status=edited}"
    )


def test_shallow_copy_shares_references_so_edits_leak_into_the_original(
    example: ModuleType,
) -> None:
    original = new_report(example)
    shallow = original.shallow_copy()

    shallow.title = "Draft"
    shallow.sections[0] = "Cover page"
    shallow.metadata["status"] = "edited"
    shallow.style.font = "Comic Sans"

    assert shallow.sections is original.sections
    assert shallow.style is original.style
    assert original.title == "Quarterly Report"
    assert str(original) == (
        "Quarterly Report | Comic Sans 12pt | sections=[Cover page, Findings] | "
        "metadata={owner=analytics, status=edited}"
    )


def test_registry_stores_a_private_clone_of_the_registered_prototype(
    example: ModuleType,
) -> None:
    registry = example.TemplateRegistry()
    source = new_report(example)
    registry.register("report", source)

    source.sections.clear()
    source.style.font = "Comic Sans"

    assert str(registry.create("report")) == REPORT_TEXT


def test_registry_hands_out_independent_clones(example: ModuleType) -> None:
    registry = example.TemplateRegistry()
    registry.register("report", new_report(example))

    first = registry.create("report")
    first.metadata["status"] = "draft"
    second = registry.create("report")

    assert first is not second
    assert second.metadata["status"] == "template"


def test_registry_lists_names_in_sorted_order(example: ModuleType) -> None:
    registry = example.TemplateRegistry()
    for name in ["report", "invoice", "Memo"]:
        registry.register(name, new_report(example))

    assert registry.names == ["Memo", "invoice", "report"]


def test_registry_rejects_an_unknown_template(example: ModuleType) -> None:
    with pytest.raises(KeyError) as info:
        example.TemplateRegistry().create("memo")

    assert info.value.args[0] == 'no template named "memo"'


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
