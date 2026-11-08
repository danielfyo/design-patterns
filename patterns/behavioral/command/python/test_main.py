"""Tests for the Command example: each command's undo, the invoker's history and the macro."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType

import pytest


def test_insert_and_undo_restore_the_previous_content(example: ModuleType) -> None:
    document, history = example.TextDocument(), example.CommandHistory()
    history.execute(example.InsertTextCommand(document, 0, "Hello"))
    history.execute(example.InsertTextCommand(document, 5, " world"))
    assert document.content == "Hello world"

    history.undo()

    assert document.content == "Hello"


def test_delete_remembers_the_removed_text_so_undo_can_bring_it_back(
    example: ModuleType,
) -> None:
    document, history = example.TextDocument(), example.CommandHistory()
    document.replace("Hello, world")

    history.execute(example.DeleteTextCommand(document, 5, 7))
    assert document.content == "Hello"
    history.undo()

    assert document.content == "Hello, world"


def test_redo_re_executes_the_last_undone_command(example: ModuleType) -> None:
    document, history = example.TextDocument(), example.CommandHistory()
    command = example.InsertTextCommand(document, 0, "Hi")
    history.execute(command)
    history.undo()

    redone = history.redo()

    assert redone is command
    assert document.content == "Hi"
    assert (history.undo_count, history.redo_count) == (1, 0)


def test_executing_a_new_command_clears_the_redo_stack(example: ModuleType) -> None:
    document, history = example.TextDocument(), example.CommandHistory()
    history.execute(example.InsertTextCommand(document, 0, "Hello"))
    history.execute(example.InsertTextCommand(document, 5, "!"))
    history.undo()
    assert history.redo_count == 1

    history.execute(example.InsertTextCommand(document, 5, "?"))

    assert history.redo_count == 0
    assert history.redo() is None
    assert document.content == "Hello?"


def test_undo_and_redo_on_an_empty_history_return_none(example: ModuleType) -> None:
    document, history = example.TextDocument(), example.CommandHistory()
    document.replace("text")

    assert history.undo() is None
    assert history.redo() is None
    assert document.content == "text"


def test_replace_all_undo_restores_the_snapshot(example: ModuleType) -> None:
    document, history = example.TextDocument(), example.CommandHistory()
    document.replace("world, world")

    history.execute(example.ReplaceAllCommand(document, "world", "WORLD"))
    assert document.content == "WORLD, WORLD"
    history.undo()

    assert document.content == "world, world"


def test_macro_runs_its_steps_in_order_and_undoes_them_as_one_step(example: ModuleType) -> None:
    document, history = example.TextDocument(), example.CommandHistory()
    document.replace("Hello, world")
    macro = example.MacroCommand(
        "Shout",
        [
            example.ReplaceAllCommand(document, "world", "WORLD"),
            example.InsertTextCommand(document, 12, "!"),
        ],
    )

    history.execute(macro)
    assert document.content == "Hello, WORLD!"
    assert history.undo_count == 1
    history.undo()

    assert document.content == "Hello, world"
    assert history.undo_count == 0


def test_commands_describe_themselves(example: ModuleType) -> None:
    document = example.TextDocument()

    assert example.InsertTextCommand(document, 3, "Hi").description == 'Insert "Hi" at 3'
    assert example.DeleteTextCommand(document, 5, 7).description == "Delete 7 chars at 5"
    assert example.ReplaceAllCommand(document, "a", "b").description == 'Replace "a" with "b"'
    assert example.MacroCommand("M", []).description == 'Macro "M" (0 steps)'


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
