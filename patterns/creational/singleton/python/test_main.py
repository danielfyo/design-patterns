"""Tests for the Singleton example: one instance, loaded once, shared by every client."""

from __future__ import annotations

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import ModuleType

import pytest


@pytest.fixture(autouse=True)
def fresh_singleton(example: ModuleType) -> Iterator[None]:
    """Forget the cached instance so every test starts as if the program had just started."""
    example.SingletonMeta._instances.clear()
    example.AppConfig.load_count = 0
    yield
    example.SingletonMeta._instances.clear()
    example.AppConfig.load_count = 0


def test_calling_the_class_always_returns_the_same_object(example: ModuleType) -> None:
    assert example.AppConfig() is example.AppConfig()


def test_configuration_is_loaded_exactly_once(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    for _ in range(10):
        example.AppConfig().get("appName")

    assert example.AppConfig.load_count == 1
    assert capsys.readouterr().out == "[config] loading configuration...\n"


def test_concurrent_callers_all_receive_the_same_instance(example: ModuleType) -> None:
    with ThreadPoolExecutor(max_workers=16) as pool:
        seen = list(pool.map(lambda _: example.AppConfig(), range(16)))

    assert len({id(config) for config in seen}) == 1
    assert example.AppConfig.load_count == 1


def test_each_class_using_the_metaclass_gets_its_own_instance(example: ModuleType) -> None:
    other_service = example.SingletonMeta("OtherService", (), {})

    assert other_service() is other_service()
    assert other_service() is not example.AppConfig()


@pytest.mark.parametrize(
    ("key", "expected"),
    [
        ("appName", "Shop API"),
        ("environment", "production"),
        ("maxConnections", "20"),
        ("timeoutSeconds", "30"),
    ],
)
def test_get_returns_the_known_settings(example: ModuleType, key: str, expected: str) -> None:
    assert example.AppConfig().get(key) == expected


def test_get_rejects_an_unknown_setting(example: ModuleType) -> None:
    with pytest.raises(KeyError, match="Unknown setting 'missing'"):
        example.AppConfig().get("missing")


def test_unrelated_modules_share_the_same_configuration(example: ModuleType) -> None:
    database = example.DatabaseModule()
    api = example.ApiModule()

    assert database.config is api.config
    assert database.config is example.AppConfig()


def test_modules_start_with_values_read_from_the_shared_instance(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.AppConfig()
    capsys.readouterr()  # drop the one-time loading line

    example.DatabaseModule().start()
    example.ApiModule().start()

    assert capsys.readouterr().out == (
        "DatabaseModule: opening pool with maxConnections=20 (production)\n"
        'ApiModule: serving "Shop API" with timeoutSeconds=30\n'
    )


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
