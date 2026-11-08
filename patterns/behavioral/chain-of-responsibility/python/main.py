"""Chain of Responsibility pattern: an HTTP request middleware pipeline.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass

REASONS = {
    200: "OK",
    400: "Bad Request",
    401: "Unauthorized",
    404: "Not Found",
    429: "Too Many Requests",
}


@dataclass
class Request:
    """The request that travels along the chain. ``user`` is set by authentication."""

    method: str
    path: str
    token: str | None
    ip: str
    body: str
    user: str | None = None


@dataclass(frozen=True)
class Response:
    """The result produced by whichever handler ends the chain."""

    status: int
    message: str

    def __str__(self) -> str:
        return f"{self.status} {REASONS.get(self.status, 'Unknown')} - {self.message}"


class Handler(ABC):
    """Handler: the common interface of every link in the chain.

    ``set_next`` returns the handler it receives so chains can be built fluently.
    """

    @abstractmethod
    def set_next(self, handler: Handler) -> Handler: ...

    @abstractmethod
    def handle(self, request: Request) -> Response: ...


class BaseHandler(Handler):
    """Base Handler: stores the successor and, by default, forwards the request to it.

    If nobody handled the request by the end of the chain, it answers 404.
    """

    def __init__(self) -> None:
        self._next: Handler | None = None

    def set_next(self, handler: Handler) -> Handler:
        self._next = handler
        return handler

    def handle(self, request: Request) -> Response:
        if self._next is not None:
            return self._next.handle(request)
        return Response(404, f"No handler for {request.path}")


class AuthenticationHandler(BaseHandler):
    """Concrete Handler: rejects requests without a known token (401)."""

    def __init__(self, tokens: Mapping[str, str]) -> None:
        super().__init__()
        self._tokens = tokens

    def handle(self, request: Request) -> Response:
        if request.token is None:
            print("  [Authentication] rejected: missing token")
            return Response(401, "Missing token")
        user = self._tokens.get(request.token)
        if user is None:
            print("  [Authentication] rejected: invalid token")
            return Response(401, "Invalid token")
        request.user = user
        print(f"  [Authentication] ok, user={user}")
        return super().handle(request)


class RateLimitHandler(BaseHandler):
    """Concrete Handler: allows at most ``limit`` requests per IP (429 afterwards).

    The in-memory counter keeps the demo deterministic (no clock, no time window).
    """

    def __init__(self, limit: int) -> None:
        super().__init__()
        self._limit = limit
        self._counts: dict[str, int] = {}

    def handle(self, request: Request) -> Response:
        count = self._counts.get(request.ip, 0) + 1
        self._counts[request.ip] = count
        if count > self._limit:
            print(f"  [RateLimit] rejected: {request.ip} exceeded {self._limit} requests")
            return Response(429, "Rate limit exceeded")
        print(f"  [RateLimit] {request.ip} request {count}/{self._limit}")
        return super().handle(request)


class ValidationHandler(BaseHandler):
    """Concrete Handler: rejects requests with an empty body (400)."""

    def handle(self, request: Request) -> Response:
        if not request.body.strip():
            print("  [Validation] rejected: empty body")
            return Response(400, "Body must not be empty")
        print("  [Validation] ok")
        return super().handle(request)


class OrderController(BaseHandler):
    """Concrete Handler at the end of the chain: the endpoint.

    It handles only its own route and passes anything else on (which ends in the base 404).
    """

    def handle(self, request: Request) -> Response:
        if request.path != "/orders":
            print("  [OrderController] not my route, passing on")
            return super().handle(request)
        print("  [OrderController] order accepted")
        return Response(200, f"Order accepted for {request.user}: {request.body}")


def main() -> None:
    print("=== Chain of Responsibility Pattern: HTTP request middleware pipeline ===")

    tokens = {"token-alice": "alice", "token-bob": "bob"}

    # Build the chain fluently: each set_next returns the handler it was given.
    pipeline = AuthenticationHandler(tokens)
    pipeline.set_next(RateLimitHandler(2)).set_next(ValidationHandler()).set_next(OrderController())
    print("Pipeline: Authentication -> RateLimit(2 per IP) -> Validation -> OrderController")

    requests = [
        Request("POST", "/orders", "token-alice", "10.0.0.1", "2x coffee"),
        Request("POST", "/orders", None, "10.0.0.2", "1x tea"),
        Request("POST", "/orders", "forged-token", "10.0.0.2", "1x tea"),
        Request("POST", "/orders", "token-alice", "10.0.0.1", ""),
        Request("POST", "/orders", "token-alice", "10.0.0.1", "1x tea"),
        Request("POST", "/orders", "token-bob", "10.0.0.3", "3x muffin"),
        Request("POST", "/invoices", "token-bob", "10.0.0.3", "invoice #42"),
    ]

    for i, r in enumerate(requests, start=1):
        token = r.token if r.token is not None else "(none)"
        print(f'Request {i}: {r.method} {r.path} ip={r.ip} token={token} body="{r.body}"')
        # The client only knows the head of the chain.
        response = pipeline.handle(r)
        print(f"  => {response}")


if __name__ == "__main__":
    main()
