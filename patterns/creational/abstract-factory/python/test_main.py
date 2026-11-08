"""Tests for the Abstract Factory example: matching families, the client and the guard."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


@pytest.mark.parametrize(
    ("factory_name", "theme", "button_name", "checkbox_name"),
    [
        ("LightTheme", "light", "LightButton", "LightCheckbox"),
        ("DarkTheme", "dark", "DarkButton", "DarkCheckbox"),
    ],
)
def test_each_factory_creates_products_of_a_single_family(
    example: ModuleType, factory_name: str, theme: str, button_name: str, checkbox_name: str
) -> None:
    factory = getattr(example, factory_name)()

    button = factory.create_button("Save")
    checkbox = factory.create_checkbox("Sync", True)

    assert factory.name == factory_name
    assert (button.theme, button.name) == (theme, button_name)
    assert (checkbox.theme, checkbox.name) == (theme, checkbox_name)
    assert isinstance(button, example.Button)
    assert isinstance(checkbox, example.Checkbox)


def test_client_renders_the_light_family_with_the_light_factory(example: ModuleType) -> None:
    assert example.SettingsScreen(example.LightTheme()).render() == [
        "[x] Email alerts    (light checkbox: tick #2563eb)",
        "[ ] Weekly digest   (light checkbox: tick #2563eb)",
        "[ Save ]            (light button: bg #ffffff, text #111827)",
    ]


def test_same_client_code_renders_the_dark_family_with_the_dark_factory(
    example: ModuleType,
) -> None:
    assert example.SettingsScreen(example.DarkTheme()).render() == [
        "[x] Email alerts    (dark checkbox: tick #60a5fa)",
        "[ ] Weekly digest   (dark checkbox: tick #60a5fa)",
        "[ Save ]            (dark button: bg #1f2937, text #f9fafb)",
    ]


def test_compose_refuses_to_mix_families(example: ModuleType) -> None:
    widgets = [example.LightButton("Save"), example.DarkCheckbox("Email alerts", True)]

    with pytest.raises(
        ValueError, match="cannot mix themes: LightButton is light, DarkCheckbox is dark"
    ):
        example.compose(widgets)


def test_compose_accepts_hand_made_widgets_of_one_family(example: ModuleType) -> None:
    lines = example.compose([example.DarkCheckbox("A", False), example.DarkButton("Go")])

    assert len(lines) == 2
    assert lines[0].startswith("[ ] A ")
    assert lines[1].startswith("[ Go ] ")


def test_products_are_immutable(example: ModuleType) -> None:
    button = example.LightButton("Save")

    with pytest.raises(AttributeError):
        button.label = "Delete"


def make_high_contrast_factory(example: ModuleType) -> Any:
    """A third family defined by the test: the client must work with it unchanged."""

    def init_widget(self: Any, label: str, checked: bool = False) -> None:
        self.label, self.checked = label, checked

    button_cls = type(
        "HighContrastButton",
        (example.Button,),
        {
            "theme": "high-contrast",
            "__init__": init_widget,
            "render": lambda self: f"HC button {self.label}",
        },
    )
    checkbox_cls = type(
        "HighContrastCheckbox",
        (example.Checkbox,),
        {
            "theme": "high-contrast",
            "__init__": init_widget,
            "render": lambda self: f"HC checkbox {self.label}={self.checked}",
        },
    )
    factory_cls = type(
        "HighContrastTheme",
        (example.ThemeFactory,),
        {
            "create_button": lambda self, label: button_cls(label),
            "create_checkbox": lambda self, label, checked: checkbox_cls(label, checked),
        },
    )
    return factory_cls()


def test_a_new_family_plugs_into_the_client_without_changing_it(example: ModuleType) -> None:
    factory = make_high_contrast_factory(example)

    assert example.SettingsScreen(factory).render() == [
        "HC checkbox Email alerts=True",
        "HC checkbox Weekly digest=False",
        "HC button Save",
    ]


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
