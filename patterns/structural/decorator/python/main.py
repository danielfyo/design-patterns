"""Decorator pattern: cross-cutting concerns stacked around a data fetcher.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping

_RESPONSES = {
    "/users": '{"users":["ada","linus"]}',
    "/orders": '{"orders":[101,102]}',
}


class FetchError(Exception):
    """Raised when a (simulated) HTTP request fails."""


class DataFetcher(ABC):
    """The Component interface: anything that can fetch the body of a URL."""

    @abstractmethod
    def fetch(self, url: str) -> str: ...


class HttpFetcher(DataFetcher):
    """Concrete Component: an in-memory fake HTTP client.

    It returns canned bodies and fails the first N calls for selected URLs,
    so retries are deterministic.
    """

    def __init__(self, fail_first: Mapping[str, int] | None = None) -> None:
        self._remaining_failures = dict(fail_first or {})

    def fetch(self, url: str) -> str:
        print(f"[http] GET {url}")
        left = self._remaining_failures.get(url, 0)
        if left > 0:
            self._remaining_failures[url] = left - 1
            raise FetchError("503 Service Unavailable")
        return _RESPONSES.get(url, "{}")


class FetcherDecorator(DataFetcher):
    """Base Decorator: forwards every call to the wrapped component.

    Concrete decorators override ``fetch`` and call ``super().fetch`` to delegate.
    """

    def __init__(self, inner: DataFetcher) -> None:
        self._inner = inner

    def fetch(self, url: str) -> str:
        return self._inner.fetch(url)


class LoggingFetcher(FetcherDecorator):
    """Concrete Decorator: logs every call and its outcome."""

    def fetch(self, url: str) -> str:
        print(f"[log] fetch {url}")
        try:
            body = super().fetch(url)
        except FetchError as err:
            print(f"[log] error {url}: {err}")
            raise
        print(f"[log] ok {url} ({len(body)} chars)")
        return body


class CachingFetcher(FetcherDecorator):
    """Concrete Decorator: remembers successful responses by URL."""

    def __init__(self, inner: DataFetcher) -> None:
        super().__init__(inner)
        self._cache: dict[str, str] = {}

    def fetch(self, url: str) -> str:
        if url in self._cache:
            print(f"[cache] hit {url}")
            return self._cache[url]
        print(f"[cache] miss {url}")
        body = super().fetch(url)
        self._cache[url] = body
        print(f"[cache] stored {url}")
        return body


class RetryFetcher(FetcherDecorator):
    """Concrete Decorator: retries failed calls up to ``max_attempts`` times."""

    def __init__(self, inner: DataFetcher, max_attempts: int) -> None:
        super().__init__(inner)
        self._max_attempts = max_attempts

    def fetch(self, url: str) -> str:
        attempt = 1
        while True:
            try:
                return super().fetch(url)
            except FetchError as err:
                last = attempt >= self._max_attempts
                outcome = "giving up" if last else "retrying"
                print(f"[retry] attempt {attempt}/{self._max_attempts} failed: {err}, {outcome}")
                if last:
                    raise
                attempt += 1


def show(fetcher: DataFetcher, url: str) -> None:
    try:
        print(f"result: {fetcher.fetch(url)}")
    except FetchError as err:
        print(f"error: {err}")


def main() -> None:
    print("=== Decorator Pattern: Data fetcher with cross-cutting concerns ===")

    # Stack A: the cache sits outside the retry, so a cached URL never touches the network.
    print("Stack A: Logging -> Caching -> Retry(3) -> Http")
    stack_a: DataFetcher = LoggingFetcher(
        CachingFetcher(RetryFetcher(HttpFetcher({"/users": 2}), 3))
    )
    show(stack_a, "/users")
    show(stack_a, "/users")

    # Stack B: same pieces, different order. Logging is inside the retry, so it sees every attempt.
    print()
    print("Stack B: Retry(3) -> Logging -> Http")
    stack_b: DataFetcher = RetryFetcher(LoggingFetcher(HttpFetcher({"/users": 2})), 3)
    show(stack_b, "/users")

    # Stack C: retries are not magic. If the server keeps failing, the error reaches the client.
    print()
    print("Stack C: Retry(2) -> Http")
    stack_c: DataFetcher = RetryFetcher(HttpFetcher({"/orders": 3}), 2)
    show(stack_c, "/orders")


if __name__ == "__main__":
    main()
