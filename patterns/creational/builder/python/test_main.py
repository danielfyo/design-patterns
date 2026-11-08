"""Tests for the Builder example: fluent steps, validation, snapshots and the director."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

URL = "https://api.example.com/users"


def test_build_applies_sensible_defaults_to_unset_parts(example: ModuleType) -> None:
    request = example.HttpRequestBuilder().url(URL).build()

    assert request.method == "GET"
    assert request.url == URL
    assert dict(request.headers) == {}
    assert dict(request.query) == {}
    assert request.body is None
    assert request.timeout_seconds == 30


def test_fluent_steps_collect_every_part_and_render_keys_in_sorted_order(
    example: ModuleType,
) -> None:
    request = (
        example.HttpRequestBuilder()
        .method("put")
        .url(URL)
        .header("x-trace", "1")
        .header("Accept", "text/plain")
        .header("Accept", "application/json")
        .query("sort", "name")
        .query("page", "2")
        .body("{}")
        .timeout(5)
        .build()
    )

    assert str(request) == (
        "PUT https://api.example.com/users?page=2&sort=name\n"
        "  Accept: application/json\n"
        "  x-trace: 1\n"
        "  timeout: 5s\n"
        "  body: {}"
    )


def make_invalid(example: ModuleType, scenario: str) -> Any:
    builder = example.HttpRequestBuilder()
    steps: dict[str, Any] = {
        "no url": lambda: builder.method("GET"),
        "GET with body": lambda: builder.url(URL).body("{}"),
        "HEAD with body": lambda: builder.method("head").url(URL).body("{}"),
        "timeout 0": lambda: builder.url(URL).timeout(0),
        "negative timeout": lambda: builder.url(URL).timeout(-1),
    }
    return steps[scenario]()


@pytest.mark.parametrize(
    ("scenario", "error"),
    [
        ("no url", "url is required"),
        ("GET with body", "GET requests cannot have a body"),
        ("HEAD with body", "HEAD requests cannot have a body"),
        ("timeout 0", "timeout must be positive"),
        ("negative timeout", "timeout must be positive"),
    ],
)
def test_build_validates_the_combination_of_parts(
    example: ModuleType, scenario: str, error: str
) -> None:
    builder = make_invalid(example, scenario)

    with pytest.raises(ValueError, match=f"^{error}$"):
        builder.build()


def test_built_request_is_a_snapshot_unaffected_by_later_builder_steps(
    example: ModuleType,
) -> None:
    builder = example.HttpRequestBuilder().url(URL).header("Accept", "application/json")
    first = builder.build()

    second = builder.header("X-Debug", "true").query("page", "3").timeout(1).build()

    assert len(first.headers) == 1
    assert len(first.query) == 0
    assert first.timeout_seconds == 30
    assert len(second.headers) == 2
    assert second.query["page"] == "3"


def test_built_request_is_immutable_all_the_way_down(example: ModuleType) -> None:
    request = example.HttpRequestBuilder().url(URL).header("Accept", "application/json").build()

    with pytest.raises(AttributeError):
        request.url = "https://evil.example.com"
    with pytest.raises(TypeError):
        request.headers["Accept"] = "text/html"


def test_director_json_post_preset_drives_the_builder_through_its_steps(
    example: ModuleType,
) -> None:
    request = example.RequestDirector.json_post(
        "https://api.example.com/orders", '{"qty":2}'
    ).build()

    assert request.method == "POST"
    assert request.headers["Accept"] == "application/json"
    assert request.headers["Content-Type"] == "application/json"
    assert request.body == '{"qty":2}'


def test_director_preset_returns_a_builder_that_accepts_extra_steps(example: ModuleType) -> None:
    request = (
        example.RequestDirector.authenticated_get("https://api.example.com/me", "t0k")
        .query("lang", "en")
        .timeout(10)
        .build()
    )

    assert request.method == "GET"
    assert request.headers["Authorization"] == "Bearer t0k"
    assert request.query["lang"] == "en"
    assert request.timeout_seconds == 10
    assert request.body is None


def test_each_director_call_starts_from_a_fresh_builder(example: ModuleType) -> None:
    first = example.RequestDirector.authenticated_get(URL, "a")
    second = example.RequestDirector.authenticated_get(URL, "b")

    first.header("X-Only-First", "1")

    assert "X-Only-First" not in second.build().headers
    assert first is not second


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
