"""Tests for the Composite example: leaves and directories share one interface."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def build_project(example: ModuleType) -> tuple[Any, Any, Any]:
    """Return (project, src, assets) for the sample tree used by the demo."""
    file, directory = example.File, example.Directory
    src = directory("src").add(
        file("index.ts", 300),
        file("app.ts", 2400),
        directory("components").add(file("Header.tsx", 1500), file("Footer.tsx", 900)),
    )
    assets = directory("assets").add(file("logo.png", 5120), file("styles.css", 640))
    project = directory("project").add(
        file("README.md", 1200), file("package.json", 800), src, assets
    )
    return project, src, assets


def test_file_is_a_leaf_with_its_own_size_and_a_single_file(example: ModuleType) -> None:
    file = example.File("app.ts", 2400)

    assert file.size() == 2400
    assert file.count_files() == 1
    assert file.find_by_extension(".ts") == ["app.ts"]
    assert file.find_by_extension(".tsx") == []


def test_directory_size_aggregates_every_nested_file(example: ModuleType) -> None:
    project, src, assets = build_project(example)

    assert src.size() == 5100
    assert assets.size() == 5760
    assert project.size() == 12860


def test_count_files_counts_leaves_only_not_directories(example: ModuleType) -> None:
    project, src, _ = build_project(example)

    assert src.count_files() == 4
    assert project.count_files() == 8


def test_empty_directory_has_no_size_and_no_files(example: ModuleType) -> None:
    empty = example.Directory("empty")

    assert empty.size() == 0
    assert empty.count_files() == 0
    assert empty.find_by_extension(".ts") == []


def test_find_by_extension_searches_the_whole_tree_in_order_and_matches_the_suffix_exactly(
    example: ModuleType,
) -> None:
    project, _, _ = build_project(example)

    assert project.find_by_extension(".ts") == ["index.ts", "app.ts"]
    assert project.find_by_extension(".tsx") == ["Header.tsx", "Footer.tsx"]


def test_clients_treat_a_leaf_and_a_composite_uniformly(example: ModuleType) -> None:
    lib = example.Directory("lib").add(example.File("a.ts", 10), example.File("b.ts", 20))
    nodes = [example.File("app.ts", 2400), lib]

    assert [node.size() for node in nodes] == [2400, 30]
    assert [node.count_files() for node in nodes] == [1, 2]


def test_add_is_fluent_and_keeps_children_in_insertion_order(example: ModuleType) -> None:
    a, b = example.File("a", 1), example.File("b", 2)
    directory = example.Directory("dir")

    assert directory.add(a).add(b) is directory
    assert directory.children == (a, b)


def test_removing_a_subtree_updates_every_aggregate(example: ModuleType) -> None:
    project, _, assets = build_project(example)

    project.remove(assets)

    assert project.size() == 7100
    assert project.count_files() == 6
    assert assets not in project.children


def test_remove_only_affects_direct_children(example: ModuleType) -> None:
    project, src, _ = build_project(example)

    assert project.remove(src.children[0]) is False
    assert project.size() == 12860


def test_print_indents_each_level_and_shows_aggregated_sizes(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    src = example.Directory("src").add(
        example.File("index.ts", 300), example.Directory("lib").add(example.File("a.ts", 10))
    )

    src.print()

    assert capsys.readouterr().out == (
        "src/ (310 bytes)\n  index.ts (300 bytes)\n  lib/ (10 bytes)\n    a.ts (10 bytes)\n"
    )


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
