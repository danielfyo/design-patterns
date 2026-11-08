"""Tests for the Memento example: the originator, opaque snapshots and the caretaker."""

from __future__ import annotations

import dataclasses
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def editor_with(example: ModuleType, text: str) -> Any:
    editor = example.Editor()
    editor.type(text)
    return editor


def test_type_inserts_at_the_cursor_and_moves_it(example: ModuleType) -> None:
    editor = editor_with(example, "Hello world")
    editor.move_cursor(5)

    editor.type(" cruel")

    assert editor.content == "Hello cruel world"
    assert editor.cursor == 11
    assert editor.render() == "Hello cruel| world"


@pytest.mark.parametrize(("position", "expected"), [(-3, 0), (2, 2), (99, 5)])
def test_move_cursor_is_clamped_to_the_text(
    example: ModuleType, position: int, expected: int
) -> None:
    editor = editor_with(example, "Hello")

    editor.move_cursor(position)

    assert editor.cursor == expected


def test_backspace_never_deletes_past_the_start(example: ModuleType) -> None:
    editor = editor_with(example, "Hello")
    editor.move_cursor(2)

    editor.backspace(10)

    assert editor.content == "llo"
    assert editor.cursor == 0


def test_restore_brings_back_both_text_and_cursor(example: ModuleType) -> None:
    editor = editor_with(example, "Hello world")
    editor.move_cursor(5)
    snapshot = editor.save()

    editor.type(" cruel")
    editor.move_cursor(0)
    editor.restore(snapshot)

    assert editor.content == "Hello world"
    assert editor.cursor == 5


def test_snapshot_is_unaffected_by_later_edits_and_can_be_reused(example: ModuleType) -> None:
    editor = editor_with(example, "Hello")
    snapshot = editor.save()

    editor.type("!!!")
    editor.restore(snapshot)
    editor.backspace(5)
    editor.restore(snapshot)

    assert editor.render() == "Hello|"


def test_snapshot_is_immutable_and_does_not_leak_its_state(example: ModuleType) -> None:
    snapshot = editor_with(example, "secret").save()

    with pytest.raises(dataclasses.FrozenInstanceError):
        snapshot._content = "changed"
    assert "secret" not in repr(snapshot)


def test_history_undoes_backups_in_reverse_order(example: ModuleType) -> None:
    editor = example.Editor()
    history = example.History(editor)
    editor.type("one")
    history.backup()
    editor.type(" two")
    history.backup()
    editor.type(" three")

    history.undo()
    assert editor.content == "one two"

    history.undo()
    assert editor.content == "one"


def test_undo_with_an_empty_history_leaves_the_editor_untouched(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    editor = editor_with(example, "Hello")
    history = example.History(editor)

    history.undo()

    assert editor.render() == "Hello|"
    assert capsys.readouterr().out == "[history] nothing to undo\n"


def test_history_reports_the_stack_size(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    history = example.History(editor_with(example, "Hi"))

    history.backup()
    history.backup()
    history.undo()

    assert capsys.readouterr().out == (
        "[history] backup saved (1 in stack)\n"
        "[history] backup saved (2 in stack)\n"
        "[history] restored latest backup (1 left)\n"
    )


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
