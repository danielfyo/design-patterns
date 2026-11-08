"""Tests for the Flyweight example: the factory shares intrinsic state between markers."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType

import pytest

SPECS = [("restaurant", "red", 32), ("hotel", "blue", 32), ("fuel", "green", 24)]


def test_factory_reuses_the_instance_for_the_same_intrinsic_state(example: ModuleType) -> None:
    factory = example.MarkerStyleFactory()

    first = factory.get_style("hotel", "blue", 32)
    second = factory.get_style("hotel", "blue", 32)

    assert first is second
    assert factory.count == 1


@pytest.mark.parametrize(
    ("icon", "color", "size_px"),
    [("fuel", "blue", 32), ("hotel", "red", 32), ("hotel", "blue", 24)],
)
def test_factory_creates_a_new_style_when_any_intrinsic_field_differs(
    example: ModuleType, icon: str, color: str, size_px: int
) -> None:
    factory = example.MarkerStyleFactory()
    hotel = factory.get_style("hotel", "blue", 32)

    other = factory.get_style(icon, color, size_px)

    assert other is not hotel
    assert factory.count == 2


def test_factory_counts_every_request_but_announces_each_style_once(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    factory = example.MarkerStyleFactory()

    for _ in range(5):
        factory.get_style("fuel", "green", 24)

    assert factory.requests == 5
    assert factory.count == 1
    assert capsys.readouterr().out == "[factory] new style: fuel/green/24px\n"


def test_many_markers_share_a_handful_of_style_objects(example: ModuleType) -> None:
    factory = example.MarkerStyleFactory()

    markers = [
        example.Marker(40.0, -3.0, f"Place {i}", factory.get_style(*SPECS[i % 3]))
        for i in range(300)
    ]

    assert factory.count == 3
    assert len({id(m.style) for m in markers}) == 3
    assert markers[0].style is markers[297].style


def test_marker_draw_combines_extrinsic_and_shared_intrinsic_state(example: ModuleType) -> None:
    style = example.MarkerStyleFactory().get_style("restaurant", "red", 32)

    a = example.Marker(40.03, -3.0, "Place 3", style)
    b = example.Marker(40.99, -3.99, "Place 9999", style)

    assert a.draw() == 'draw restaurant icon (red, 32px) at (40.0300, -3.0000) label "Place 3"'
    assert b.draw() == 'draw restaurant icon (red, 32px) at (40.9900, -3.9900) label "Place 9999"'


def test_style_holds_the_heavy_bitmap_while_markers_only_reference_it(
    example: ModuleType,
) -> None:
    style = example.MarkerStyleFactory().get_style("hotel", "blue", 32)

    marker = example.Marker(1.0, 2.0, "x", style)

    assert len(style.icon_bitmap) == example.ICON_BITMAP_BYTES
    assert marker.style.icon_bitmap is style.icon_bitmap


def test_shared_style_is_immutable(example: ModuleType) -> None:
    style = example.MarkerStyleFactory().get_style("hotel", "blue", 32)

    with pytest.raises(AttributeError):
        style.color = "red"


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
