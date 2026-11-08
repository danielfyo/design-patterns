"""Command pattern: a text editor with undo/redo.

Run with:  python3 main.py
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol


class TextDocument:
    """Receiver: knows how to do the real work; has no idea commands or undo exist."""

    def __init__(self) -> None:
        self.content = ""

    def insert(self, position: int, text: str) -> None:
        self.content = self.content[:position] + text + self.content[position:]

    def delete(self, position: int, length: int) -> str:
        """Remove ``length`` characters and return them."""
        removed = self.content[position : position + length]
        self.content = self.content[:position] + self.content[position + length :]
        return removed

    def replace(self, content: str) -> None:
        self.content = content


class Command(Protocol):
    """Command: every editor operation exposes the same interface, so the invoker
    can execute, store, undo and redo it without knowing what it does."""

    @property
    def description(self) -> str: ...

    def execute(self) -> None: ...

    def undo(self) -> None: ...


class InsertTextCommand:
    """Concrete Command: inserts text; undo removes the same characters."""

    def __init__(self, document: TextDocument, position: int, text: str) -> None:
        self._document = document
        self._position = position
        self._text = text

    @property
    def description(self) -> str:
        return f'Insert "{self._text}" at {self._position}'

    def execute(self) -> None:
        self._document.insert(self._position, self._text)

    def undo(self) -> None:
        self._document.delete(self._position, len(self._text))


class DeleteTextCommand:
    """Concrete Command: deletes text and remembers it, because the receiver
    cannot bring it back on its own."""

    def __init__(self, document: TextDocument, position: int, length: int) -> None:
        self._document = document
        self._position = position
        self._length = length
        self._deleted = ""

    @property
    def description(self) -> str:
        return f"Delete {self._length} chars at {self._position}"

    def execute(self) -> None:
        self._deleted = self._document.delete(self._position, self._length)

    def undo(self) -> None:
        self._document.insert(self._position, self._deleted)


class ReplaceAllCommand:
    """Concrete Command: replaces every occurrence of a word. Undo restores a
    snapshot of the previous content (simpler than inverting each replacement)."""

    def __init__(self, document: TextDocument, find: str, replacement: str) -> None:
        self._document = document
        self._find = find
        self._replacement = replacement
        self._before = ""

    @property
    def description(self) -> str:
        return f'Replace "{self._find}" with "{self._replacement}"'

    def execute(self) -> None:
        self._before = self._document.content
        self._document.replace(self._before.replace(self._find, self._replacement))

    def undo(self) -> None:
        self._document.replace(self._before)


class MacroCommand:
    """Macro Command (a Composite of commands): executes its children in order and
    undoes them in reverse order, so the whole macro is a single undo step."""

    def __init__(self, name: str, commands: Sequence[Command]) -> None:
        self._name = name
        self._commands = list(commands)

    @property
    def description(self) -> str:
        return f'Macro "{self._name}" ({len(self._commands)} steps)'

    def execute(self) -> None:
        for command in self._commands:
            command.execute()

    def undo(self) -> None:
        for command in reversed(self._commands):
            command.undo()


class CommandHistory:
    """Invoker: executes commands and keeps the undo/redo history. Executing a new
    command clears the redo stack (the "future" is no longer valid)."""

    def __init__(self) -> None:
        self._undo: list[Command] = []
        self._redo: list[Command] = []

    @property
    def undo_count(self) -> int:
        return len(self._undo)

    @property
    def redo_count(self) -> int:
        return len(self._redo)

    def execute(self, command: Command) -> None:
        command.execute()
        self._undo.append(command)
        self._redo.clear()

    def undo(self) -> Command | None:
        """Undo the last command and return it, or None if there is nothing to undo."""
        if not self._undo:
            return None
        command = self._undo.pop()
        command.undo()
        self._redo.append(command)
        return command

    def redo(self) -> Command | None:
        """Re-execute the last undone command and return it, or None if there is nothing to redo."""
        if not self._redo:
            return None
        command = self._redo.pop()
        command.execute()
        self._undo.append(command)
        return command


def main() -> None:
    print("=== Command Pattern: Text editor with undo/redo ===")

    document = TextDocument()
    history = CommandHistory()

    def show(action: str, description: str) -> None:
        print(f'{action:<8}{description:<30} -> "{document.content}"')

    def execute(command: Command) -> None:
        history.execute(command)
        show("execute", command.description)

    def undo() -> None:
        command = history.undo()
        show("undo", command.description if command else "(nothing to undo)")

    def redo() -> None:
        command = history.redo()
        show("redo", command.description if command else "(nothing to redo)")

    execute(InsertTextCommand(document, 0, "Hello"))
    execute(InsertTextCommand(document, 5, " world"))
    execute(InsertTextCommand(document, 5, ","))
    undo()
    redo()
    execute(DeleteTextCommand(document, 5, 7))
    undo()
    # A new command after an undo clears the redo stack.
    execute(InsertTextCommand(document, 6, " big"))
    redo()
    # A macro groups several commands into a single undoable step.
    execute(
        MacroCommand(
            "Shout",
            [
                ReplaceAllCommand(document, "world", "WORLD"),
                InsertTextCommand(document, 16, "!"),
            ],
        )
    )
    undo()
    undo()
    print(f"History: undo={history.undo_count}, redo={history.redo_count}")


if __name__ == "__main__":
    main()
