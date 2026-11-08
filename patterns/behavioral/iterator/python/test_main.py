"""Tests for the Iterator example: lazy paging, early stop and both iterator forms."""

from __future__ import annotations

from itertools import islice
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def drain(iterator: Any) -> list[int]:
    ids: list[int] = []
    while iterator.has_next():
        ids.append(iterator.next().id)
    return ids


def test_explicit_iterator_walks_every_product_in_order_across_pages(example: ModuleType) -> None:
    api = example.ProductApi()

    ids = drain(example.ProductCatalog(api, page_size=3).create_iterator())

    assert ids == [1, 2, 3, 4, 5, 6, 7]
    assert api.request_count == 3


def test_explicit_iterator_fetches_pages_lazily_and_only_once(example: ModuleType) -> None:
    api = example.ProductApi()
    iterator = example.ProductCatalog(api, page_size=3).create_iterator()
    assert api.request_count == 0

    assert iterator.has_next()
    assert iterator.has_next()
    assert api.request_count == 1

    for _ in range(3):
        iterator.next()
    assert api.request_count == 1

    iterator.next()
    assert api.request_count == 2


def test_next_past_the_end_raises(example: ModuleType) -> None:
    iterator = example.ProductCatalog(example.ProductApi(), page_size=3).create_iterator()
    drain(iterator)

    assert not iterator.has_next()
    with pytest.raises(StopIteration):
        iterator.next()


def test_each_iterator_keeps_its_own_position(example: ModuleType) -> None:
    catalog = example.ProductCatalog(example.ProductApi(), page_size=3)
    first, second = catalog.create_iterator(), catalog.create_iterator()

    first.next()
    first.next()

    assert first.next().id == 3
    assert second.next().id == 1


@pytest.mark.parametrize(("page_size", "requests"), [(1, 7), (3, 3), (7, 1), (10, 1)])
def test_page_size_decides_how_many_requests_a_full_walk_needs(
    example: ModuleType, page_size: int, requests: int
) -> None:
    api = example.ProductApi()

    ids = drain(example.ProductCatalog(api, page_size).create_iterator())

    assert len(ids) == 7
    assert api.request_count == requests


def test_iterable_form_yields_the_same_products(example: ModuleType) -> None:
    names = [p.name for p in example.ProductCatalog(example.ProductApi(), page_size=3)]

    assert names == ["Keyboard", "Mouse", "Monitor", "Webcam", "Headset", "USB hub", "Desk lamp"]


def test_stopping_early_never_fetches_the_remaining_pages(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    api = example.ProductApi()

    first_four = list(islice(example.ProductCatalog(api, page_size=3), 4))

    assert len(first_four) == 4
    assert api.request_count == 2
    assert capsys.readouterr().out == "[api] fetching page 1\n[api] fetching page 2\n"


def test_iterable_does_nothing_until_it_is_iterated(example: ModuleType) -> None:
    api = example.ProductApi()

    generator = iter(example.ProductCatalog(api, page_size=3))
    assert api.request_count == 0

    assert next(generator).id == 1
    assert api.request_count == 1


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
