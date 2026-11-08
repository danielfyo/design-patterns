"""Abstract Factory pattern: a UI theme kit that produces matching families
of widgets (buttons and checkboxes).

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass


class Widget(ABC):
    """Something every widget has: a type name and the theme family it belongs to."""

    theme: str

    @property
    def name(self) -> str:
        return type(self).__name__

    @abstractmethod
    def render(self) -> str: ...


class Button(Widget):
    """Abstract Product A: a push button."""


class Checkbox(Widget):
    """Abstract Product B: a checkbox."""


def _box(checked: bool, label: str) -> str:
    return f"[{'x' if checked else ' '}] {label}".ljust(20)


@dataclass(frozen=True)
class LightButton(Button):
    """Concrete Product A1: a button of the light family."""

    label: str
    theme = "light"

    def render(self) -> str:
        return f"{f'[ {self.label} ]':<20}(light button: bg #ffffff, text #111827)"


@dataclass(frozen=True)
class LightCheckbox(Checkbox):
    """Concrete Product B1: a checkbox of the light family."""

    label: str
    checked: bool
    theme = "light"

    def render(self) -> str:
        return f"{_box(self.checked, self.label)}(light checkbox: tick #2563eb)"


@dataclass(frozen=True)
class DarkButton(Button):
    """Concrete Product A2: a button of the dark family."""

    label: str
    theme = "dark"

    def render(self) -> str:
        return f"{f'[ {self.label} ]':<20}(dark button: bg #1f2937, text #f9fafb)"


@dataclass(frozen=True)
class DarkCheckbox(Checkbox):
    """Concrete Product B2: a checkbox of the dark family."""

    label: str
    checked: bool
    theme = "dark"

    def render(self) -> str:
        return f"{_box(self.checked, self.label)}(dark checkbox: tick #60a5fa)"


class ThemeFactory(ABC):
    """Abstract Factory: one creation method per product of the family."""

    @property
    def name(self) -> str:
        return type(self).__name__

    @abstractmethod
    def create_button(self, label: str) -> Button: ...

    @abstractmethod
    def create_checkbox(self, label: str, checked: bool) -> Checkbox: ...


class LightTheme(ThemeFactory):
    """Concrete Factory 1: produces the light family."""

    def create_button(self, label: str) -> Button:
        return LightButton(label)

    def create_checkbox(self, label: str, checked: bool) -> Checkbox:
        return LightCheckbox(label, checked)


class DarkTheme(ThemeFactory):
    """Concrete Factory 2: produces the dark family."""

    def create_button(self, label: str) -> Button:
        return DarkButton(label)

    def create_checkbox(self, label: str, checked: bool) -> Checkbox:
        return DarkCheckbox(label, checked)


def compose(widgets: Sequence[Widget]) -> list[str]:
    """Lays widgets out and refuses to mix families on one screen."""
    first = widgets[0]
    for widget in widgets:
        if widget.theme != first.theme:
            raise ValueError(
                f"cannot mix themes: {first.name} is {first.theme}, {widget.name} is {widget.theme}"
            )
    return [w.render() for w in widgets]


class SettingsScreen:
    """Client: renders a settings form using only the abstract factory and products."""

    def __init__(self, factory: ThemeFactory) -> None:
        self._factory = factory

    def render(self) -> list[str]:
        return compose(
            [
                self._factory.create_checkbox("Email alerts", True),
                self._factory.create_checkbox("Weekly digest", False),
                self._factory.create_button("Save"),
            ]
        )


def main() -> None:
    print("=== Abstract Factory Pattern: UI theme kit ===")

    # The concrete factory is chosen once (e.g. from user preferences)...
    themes: list[ThemeFactory] = [LightTheme(), DarkTheme()]

    # ...and the client code is identical for every family.
    for theme in themes:
        print(f"Settings screen with {theme.name}:")
        for line in SettingsScreen(theme).render():
            print(f"  {line}")

    print("Picking the factory from a preference string:")
    for preference in ["dark", "light"]:
        factory: ThemeFactory = DarkTheme() if preference == "dark" else LightTheme()
        checkbox = factory.create_checkbox("Sync", True)
        print(f"  preference={preference:<5} -> {factory.name:<10} -> {checkbox.name}")

    print("Mixing families by hand (bypassing the factory):")
    try:
        compose([LightButton("Save"), DarkCheckbox("Email alerts", True)])
    except ValueError as err:
        print(f"  error: {err}")


if __name__ == "__main__":
    main()
