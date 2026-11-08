"""Memento pattern: save and restore an editor's state without exposing it.

Run with:  python3 main.py
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, repr=False)
class EditorSnapshot:
    """Concrete Memento: immutable (frozen) and opaque *by convention*.

    The leading underscores say "private to the Editor": Python cannot enforce
    it, but linters and readers treat ``_content`` as off-limits to the caretaker.
    ``repr=False`` avoids leaking the state into logs.
    """

    _content: str
    _cursor: int


class Editor:
    """The Originator: owns the state (text and cursor), creates snapshots of it
    and restores itself from them."""

    def __init__(self) -> None:
        self._content = ""
        self._cursor = 0

    @property
    def content(self) -> str:
        return self._content

    @property
    def cursor(self) -> int:
        return self._cursor

    def type(self, text: str) -> None:
        self._content = self._content[: self._cursor] + text + self._content[self._cursor :]
        self._cursor += len(text)

    def move_cursor(self, position: int) -> None:
        self._cursor = min(max(position, 0), len(self._content))

    def backspace(self, count: int) -> None:
        n = min(count, self._cursor)
        self._content = self._content[: self._cursor - n] + self._content[self._cursor :]
        self._cursor -= n

    def render(self) -> str:
        """The text with a "|" where the cursor is."""
        return self._content[: self._cursor] + "|" + self._content[self._cursor :]

    def save(self) -> EditorSnapshot:
        """Create a memento with a copy of the current state."""
        return EditorSnapshot(self._content, self._cursor)

    def restore(self, snapshot: EditorSnapshot) -> None:
        """Restore the state captured in a memento."""
        self._content = snapshot._content
        self._cursor = snapshot._cursor


class History:
    """The Caretaker: keeps a stack of snapshots and decides *when* to save and
    restore, without ever looking inside them."""

    def __init__(self, editor: Editor) -> None:
        self._editor = editor
        self._snapshots: list[EditorSnapshot] = []

    def backup(self) -> None:
        self._snapshots.append(self._editor.save())
        print(f"[history] backup saved ({len(self._snapshots)} in stack)")

    def undo(self) -> None:
        if not self._snapshots:
            print("[history] nothing to undo")
            return
        self._editor.restore(self._snapshots.pop())
        print(f"[history] restored latest backup ({len(self._snapshots)} left)")


def main() -> None:
    print("=== Memento Pattern: Editor snapshots ===")

    editor = Editor()
    history = History(editor)

    def show(action: str) -> None:
        print(f'{action:<20} "{editor.render()}" (cursor {editor.cursor})')

    def type_text(text: str) -> None:
        editor.type(text)
        show(f'type "{text}"')

    def undo() -> None:
        history.undo()
        show("undo")

    type_text("Hello")
    history.backup()
    type_text(" world")
    history.backup()

    editor.move_cursor(5)
    show("move cursor to 5")
    type_text(" cruel")
    undo()  # back to "Hello world|", cursor included

    type_text("!")
    history.backup()
    editor.backspace(7)
    show("backspace 7")

    undo()
    undo()
    undo()  # the stack is empty: nothing happens


if __name__ == "__main__":
    main()
