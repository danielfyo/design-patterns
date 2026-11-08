"""Builder pattern: an HTTP request builder with a fluent interface,
validation in build() and a director with ready-made recipes.

Run with:  python3 main.py
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from types import MappingProxyType


@dataclass(frozen=True)
class HttpRequest:
    """Product: an immutable HTTP request.

    It has many optional parts, which is exactly why constructing it directly is
    painful. Create it with HttpRequestBuilder. The mappings are read-only views
    over sorted copies, so the frozen dataclass is immutable all the way down.
    """

    method: str
    url: str
    headers: Mapping[str, str]
    query: Mapping[str, str]
    body: str | None
    timeout_seconds: int

    def __str__(self) -> str:
        """Deterministic, human-readable rendering (keys are sorted)."""
        qs = "&".join(f"{k}={v}" for k, v in self.query.items())
        lines = [f"{self.method} {self.url}" + (f"?{qs}" if qs else "")]
        lines += [f"  {name}: {value}" for name, value in self.headers.items()]
        lines.append(f"  timeout: {self.timeout_seconds}s")
        lines.append(f"  body: {self.body if self.body is not None else '(none)'}")
        return "\n".join(lines)


def _frozen_sorted(items: dict[str, str]) -> Mapping[str, str]:
    return MappingProxyType(dict(sorted(items.items())))


class HttpRequestBuilder:
    """Builder: collects the parts step by step, validates them in build()."""

    def __init__(self) -> None:
        self._method = "GET"
        self._url: str | None = None
        self._headers: dict[str, str] = {}
        self._query: dict[str, str] = {}
        self._body: str | None = None
        self._timeout_seconds = 30

    def method(self, method: str) -> HttpRequestBuilder:
        self._method = method.upper()
        return self

    def url(self, url: str) -> HttpRequestBuilder:
        self._url = url
        return self

    def header(self, name: str, value: str) -> HttpRequestBuilder:
        self._headers[name] = value
        return self

    def query(self, name: str, value: str) -> HttpRequestBuilder:
        self._query[name] = value
        return self

    def body(self, body: str) -> HttpRequestBuilder:
        self._body = body
        return self

    def timeout(self, seconds: int) -> HttpRequestBuilder:
        self._timeout_seconds = seconds
        return self

    def build(self) -> HttpRequest:
        """Validates the combination of parts and creates an immutable snapshot."""
        if not self._url:
            raise ValueError("url is required")
        if self._body is not None and self._method in ("GET", "HEAD"):
            raise ValueError(f"{self._method} requests cannot have a body")
        if self._timeout_seconds <= 0:
            raise ValueError("timeout must be positive")
        return HttpRequest(
            method=self._method,
            url=self._url,
            headers=_frozen_sorted(self._headers),
            query=_frozen_sorted(self._query),
            body=self._body,
            timeout_seconds=self._timeout_seconds,
        )


class RequestDirector:
    """Director: knows the recipes for common requests.

    Each preset drives the builder through a fixed sequence of steps and hands it
    back, so the caller can still add steps before calling build().
    """

    @staticmethod
    def json_post(url: str, body: str) -> HttpRequestBuilder:
        return (
            HttpRequestBuilder()
            .method("POST")
            .url(url)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .body(body)
        )

    @staticmethod
    def authenticated_get(url: str, token: str) -> HttpRequestBuilder:
        return (
            HttpRequestBuilder()
            .method("GET")
            .url(url)
            .header("Authorization", f"Bearer {token}")
            .header("Accept", "application/json")
        )


def show(request: HttpRequest) -> None:
    print("  " + str(request).replace("\n", "\n  "))


def main() -> None:
    print("=== Builder Pattern: HTTP request builder ===")

    print("1) Step by step with the fluent builder:")
    show(
        HttpRequestBuilder()
        .url("https://api.example.com/users")
        .header("X-Request-Id", "req-001")
        .header("Accept", "application/json")
        .query("sort", "name")
        .query("page", "2")
        .timeout(5)
        .build()
    )

    print("2) Director preset jsonPost(url, body):")
    show(
        RequestDirector.json_post(
            "https://api.example.com/orders", '{"sku":"A-42","qty":2}'
        ).build()
    )

    print("3) Preset authenticatedGet(url, token) + extra steps:")
    show(
        RequestDirector.authenticated_get("https://api.example.com/me", "demo-token-123")
        .query("lang", "en")
        .query("fields", "name,email")
        .timeout(10)
        .build()
    )

    print("4) build() validates before creating the product:")
    invalid: list[tuple[str, Callable[[], HttpRequestBuilder]]] = [
        ("no url", lambda: HttpRequestBuilder().method("GET")),
        (
            "GET with body",
            lambda: HttpRequestBuilder().url("https://api.example.com/users").body("{}"),
        ),
        (
            "timeout 0",
            lambda: RequestDirector.json_post("https://api.example.com/orders", "{}").timeout(0),
        ),
    ]
    for label, make in invalid:
        try:
            make().build()
            print(f"  {label:<13} -> built")
        except ValueError as err:
            print(f"  {label:<13} -> error: {err}")

    print("5) Built requests are immutable snapshots:")
    builder = RequestDirector.authenticated_get("https://api.example.com/me", "demo-token-123")
    first = builder.build()
    second = builder.header("X-Debug", "true").build()
    print(f"  first has {len(first.headers)} headers, second has {len(second.headers)} headers")


if __name__ == "__main__":
    main()
