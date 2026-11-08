"""Tests for the Decorator example: each concern in isolation, then how stacking order matters."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType

import pytest

USERS_BODY = '{"users":["ada","linus"]}'


def lines_starting_with(output: str, prefix: str) -> int:
    return sum(1 for line in output.splitlines() if line.startswith(prefix))


def test_http_fetcher_returns_canned_bodies_and_an_empty_object_for_unknown_urls(
    example: ModuleType,
) -> None:
    http = example.HttpFetcher()

    assert http.fetch("/users") == USERS_BODY
    assert http.fetch("/unknown") == "{}"


def test_retry_recovers_from_transient_failures(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    fetcher = example.RetryFetcher(example.HttpFetcher({"/users": 2}), 3)

    assert fetcher.fetch("/users") == USERS_BODY
    assert lines_starting_with(capsys.readouterr().out, "[http] GET /users") == 3


def test_retry_gives_up_after_max_attempts_and_reraises(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    fetcher = example.RetryFetcher(example.HttpFetcher({"/orders": 3}), 2)

    with pytest.raises(example.FetchError, match="503 Service Unavailable"):
        fetcher.fetch("/orders")

    out = capsys.readouterr().out
    assert lines_starting_with(out, "[http] GET /orders") == 2
    assert "attempt 2/2 failed: 503 Service Unavailable, giving up" in out


def test_caching_serves_repeated_requests_without_reaching_the_wrapped_component(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    calls: list[str] = []

    class Counting(example.FetcherDecorator):  # type: ignore[name-defined, misc]
        def fetch(self, url: str) -> str:
            calls.append(url)
            result: str = super().fetch(url)
            return result

    fetcher = example.CachingFetcher(Counting(example.HttpFetcher()))

    assert fetcher.fetch("/users") == fetcher.fetch("/users")
    assert calls == ["/users"]
    assert "[cache] hit /users" in capsys.readouterr().out


def test_caching_does_not_remember_failures(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    fetcher = example.CachingFetcher(example.HttpFetcher({"/users": 1}))

    with pytest.raises(example.FetchError):
        fetcher.fetch("/users")

    assert fetcher.fetch("/users") == USERS_BODY
    assert "[cache] hit" not in capsys.readouterr().out


def test_logging_reports_the_error_and_reraises_it(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    fetcher = example.LoggingFetcher(example.HttpFetcher({"/users": 1}))

    with pytest.raises(example.FetchError):
        fetcher.fetch("/users")

    assert "[log] error /users: 503 Service Unavailable" in capsys.readouterr().out


def test_order_matters_logging_outside_retry_sees_one_call(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    fetcher = example.LoggingFetcher(example.RetryFetcher(example.HttpFetcher({"/users": 2}), 3))

    fetcher.fetch("/users")

    out = capsys.readouterr().out
    assert lines_starting_with(out, "[log] fetch /users") == 1
    assert lines_starting_with(out, "[log] error") == 0


def test_order_matters_logging_inside_retry_sees_every_attempt(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    fetcher = example.RetryFetcher(example.LoggingFetcher(example.HttpFetcher({"/users": 2})), 3)

    fetcher.fetch("/users")

    out = capsys.readouterr().out
    assert lines_starting_with(out, "[log] fetch /users") == 3
    assert lines_starting_with(out, "[log] error /users") == 2


def test_cache_outside_retry_answers_the_second_call_without_any_http_request(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    fetcher = example.CachingFetcher(example.RetryFetcher(example.HttpFetcher({"/users": 2}), 3))
    fetcher.fetch("/users")
    capsys.readouterr()

    assert fetcher.fetch("/users") == USERS_BODY
    assert "[http]" not in capsys.readouterr().out


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
