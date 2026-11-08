"""Tests for the Chain of Responsibility example: each handler, short-circuits, then the chain."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

TOKENS = {"token-alice": "alice", "token-bob": "bob"}


def build_pipeline(example: ModuleType, limit: int = 2) -> Any:
    head = example.AuthenticationHandler(TOKENS)
    head.set_next(example.RateLimitHandler(limit)).set_next(example.ValidationHandler()).set_next(
        example.OrderController()
    )
    return head


def order(
    example: ModuleType,
    token: str | None = "token-alice",
    ip: str = "10.0.0.1",
    body: str = "2x coffee",
    path: str = "/orders",
) -> Any:
    return example.Request("POST", path, token, ip, body)


def make_probe(example: ModuleType) -> Any:
    """A handler that records how many requests reached it."""

    class Probe(example.BaseHandler):  # type: ignore[name-defined, misc]
        def __init__(self) -> None:
            super().__init__()
            self.calls = 0

        def handle(self, request: Any) -> Any:
            self.calls += 1
            return example.Response(200, "probe")

    return Probe()


def test_a_valid_request_travels_the_whole_chain(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    response = build_pipeline(example).handle(order(example))

    assert response == example.Response(200, "Order accepted for alice: 2x coffee")
    assert capsys.readouterr().out == (
        "  [Authentication] ok, user=alice\n  [RateLimit] 10.0.0.1 request 1/2\n"
        "  [Validation] ok\n  [OrderController] order accepted\n"
    )


@pytest.mark.parametrize(
    ("token", "message"), [(None, "Missing token"), ("forged-token", "Invalid token")]
)
def test_authentication_short_circuits_without_calling_the_next_handler(
    example: ModuleType, token: str | None, message: str
) -> None:
    probe = make_probe(example)
    auth = example.AuthenticationHandler(TOKENS)
    auth.set_next(probe)

    response = auth.handle(order(example, token=token))

    assert response == example.Response(401, message)
    assert probe.calls == 0


def test_authentication_sets_the_user_for_later_handlers(example: ModuleType) -> None:
    request = order(example, token="token-bob")
    auth = example.AuthenticationHandler(TOKENS)
    auth.set_next(make_probe(example))

    auth.handle(request)

    assert request.user == "bob"


def test_rate_limit_counts_per_ip_and_rejects_once_the_limit_is_exceeded(
    example: ModuleType,
) -> None:
    probe = make_probe(example)
    limiter = example.RateLimitHandler(2)
    limiter.set_next(probe)

    ips = ["10.0.0.1", "10.0.0.1", "10.0.0.1", "10.0.0.2"]
    statuses = [limiter.handle(order(example, ip=ip)).status for ip in ips]

    assert statuses == [200, 200, 429, 200]
    assert probe.calls == 3


@pytest.mark.parametrize("body", ["", "   "])
def test_validation_rejects_an_empty_body(
    example: ModuleType, capsys: pytest.CaptureFixture[str], body: str
) -> None:
    response = build_pipeline(example).handle(order(example, body=body))

    assert response == example.Response(400, "Body must not be empty")
    assert "[OrderController]" not in capsys.readouterr().out


def test_a_request_nobody_handles_falls_off_the_end_with_404(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    response = build_pipeline(example).handle(order(example, path="/invoices"))

    assert response == example.Response(404, "No handler for /invoices")
    assert "[OrderController] not my route, passing on" in capsys.readouterr().out


def test_set_next_returns_the_handler_it_receives(example: ModuleType) -> None:
    head = example.ValidationHandler()
    nxt = example.OrderController()

    assert head.set_next(nxt) is nxt


@pytest.mark.parametrize(
    ("status", "expected"),
    [(200, "200 OK - done"), (429, "429 Too Many Requests - done"), (418, "418 Unknown - done")],
)
def test_response_formats_status_reason_and_message(
    example: ModuleType, status: int, expected: str
) -> None:
    assert str(example.Response(status, "done")) == expected


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
