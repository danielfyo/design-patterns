"""Composite pattern: files and directories treated uniformly as a tree.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class FileSystemNode(ABC):
    """Component: the common interface for files and directories.

    Clients call these operations without knowing whether they talk to a single
    file or a whole tree.
    """

    def __init__(self, name: str) -> None:
        self.name = name

    @abstractmethod
    def size(self) -> int: ...

    @abstractmethod
    def count_files(self) -> int: ...

    @abstractmethod
    def find_by_extension(self, extension: str) -> list[str]: ...

    @abstractmethod
    def print(self, indent: int = 0) -> None:
        """Print this node (and its subtree). Inside methods, ``print(...)`` is still the builtin."""


class File(FileSystemNode):
    """Leaf: a file has a size of its own and no children."""

    def __init__(self, name: str, size_in_bytes: int) -> None:
        super().__init__(name)
        self._size = size_in_bytes

    def size(self) -> int:
        return self._size

    def count_files(self) -> int:
        return 1

    def find_by_extension(self, extension: str) -> list[str]:
        return [self.name] if self.name.endswith(extension) else []

    def print(self, indent: int = 0) -> None:
        print(f"{'  ' * indent}{self.name} ({self.size()} bytes)")


class Directory(FileSystemNode):
    """Composite: stores child nodes and implements every operation by delegating to them."""

    def __init__(self, name: str) -> None:
        super().__init__(name)
        self._children: list[FileSystemNode] = []

    @property
    def children(self) -> tuple[FileSystemNode, ...]:
        return tuple(self._children)

    def add(self, *nodes: FileSystemNode) -> Directory:
        """Return ``self`` so trees can be built fluently."""
        self._children.extend(nodes)
        return self

    def remove(self, node: FileSystemNode) -> None:
        self._children.remove(node)

    def size(self) -> int:
        return sum(child.size() for child in self._children)

    def count_files(self) -> int:
        return sum(child.count_files() for child in self._children)

    def find_by_extension(self, extension: str) -> list[str]:
        return [name for child in self._children for name in child.find_by_extension(extension)]

    def print(self, indent: int = 0) -> None:
        print(f"{'  ' * indent}{self.name}/ ({self.size()} bytes)")
        for child in self._children:
            child.print(indent + 1)


def main() -> None:
    print("=== Composite Pattern: File system ===")

    app_ts = File("app.ts", 2400)
    src = Directory("src").add(
        File("index.ts", 300),
        app_ts,
        Directory("components").add(File("Header.tsx", 1500), File("Footer.tsx", 900)),
    )
    assets = Directory("assets").add(File("logo.png", 5120), File("styles.css", 640))
    project = Directory("project").add(File("README.md", 1200), File("package.json", 800), src, assets)

    # One call prints the whole tree: each directory delegates to its children.
    project.print()
    print(f"Total size: {project.size()} bytes")
    print(f"Files: {project.count_files()}")
    for extension in (".ts", ".tsx"):
        print(f"Find *{extension}: {', '.join(project.find_by_extension(extension))}")

    # The client treats a single file and a whole folder uniformly.
    print("The same calls work on a leaf and on a folder:")
    nodes: list[FileSystemNode] = [app_ts, src]
    for node in nodes:
        print(f"  {node.name:<16} -> {node.size()} bytes, {node.count_files()} file(s)")

    print("Removing assets/ from project/...")
    project.remove(assets)
    project.print()
    print(f"Total size: {project.size()} bytes, files: {project.count_files()}")


if __name__ == "__main__":
    main()
