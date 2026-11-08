"""Proxy pattern: a lazy, caching, role-checking proxy for a remote document store.

Run with:  python3 main.py
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import cached_property
from typing import Protocol


@dataclass(frozen=True)
class User:
    name: str
    role: str


@dataclass(frozen=True)
class Document:
    id: str
    title: str
    classification: str


class AccessDeniedError(Exception):
    """Raised by the protection proxy when a user may not read a document."""


class DocumentStore(Protocol):
    """The Subject interface: shared by the real store and the proxy."""

    def get_document(self, doc_id: str, user: User) -> Document: ...


_DOCUMENTS = {
    "doc-1": Document("doc-1", "Q3 roadmap", "public"),
    "doc-2": Document("doc-2", "Merger plan", "confidential"),
}


class RemoteDocumentStore:
    """The Real Subject: a remote document server.

    Expensive to create (it opens a connection) and every call is a network
    round trip. It trusts its caller and performs no authorization of its own.
    """

    def __init__(self) -> None:
        print("[remote] connecting to document server...")

    def get_document(self, doc_id: str, user: User) -> Document:
        print(f"[remote] fetching {doc_id}")
        return _DOCUMENTS[doc_id]


class DocumentStoreProxy:
    """The Proxy: same interface as the real store, but it controls access to it.

    Virtual (creates the real store lazily), caching (remembers fetched
    documents) and protection (viewers may not read confidential documents).
    """

    def __init__(self) -> None:
        self._cache: dict[str, Document] = {}
        self.requests = 0
        self.remote_fetches = 0

    @cached_property
    def _real(self) -> RemoteDocumentStore:
        """Virtual proxy: computed on first access only, then stored on the instance."""
        print("[proxy] creating the real store on first use")
        return RemoteDocumentStore()

    @property
    def is_real_store_created(self) -> bool:
        return "_real" in self.__dict__

    def get_document(self, doc_id: str, user: User) -> Document:
        self.requests += 1

        # Caching proxy.
        doc = self._cache.get(doc_id)
        if doc is not None:
            print(f"[proxy] cache hit {doc_id}")
        else:
            print(f"[proxy] cache miss {doc_id}")
            doc = self._real.get_document(doc_id, user)
            self.remote_fetches += 1
            self._cache[doc_id] = doc

        # Protection proxy: authorize every request, cached or not.
        if user.role == "viewer" and doc.classification == "confidential":
            raise AccessDeniedError(f"{user.role} cannot read confidential {doc_id}")
        return doc


def main() -> None:
    print("=== Proxy Pattern: Document store proxy ===")

    proxy = DocumentStoreProxy()
    store: DocumentStore = proxy  # the client only sees the Subject interface
    print(f"Proxy ready, real store created: {str(proxy.is_real_store_created).lower()}")

    alice = User("alice", "editor")
    bob = User("bob", "viewer")

    def request(user: User, doc_id: str) -> None:
        print(f"{user.name} ({user.role}) asks for {doc_id}")
        try:
            doc = store.get_document(doc_id, user)
            print(f'  -> "{doc.title}" ({doc.classification})')
        except AccessDeniedError as err:
            print(f"  -> access denied: {err}")

    request(alice, "doc-1")
    request(bob, "doc-1")
    request(bob, "doc-2")
    request(alice, "doc-2")

    created = str(proxy.is_real_store_created).lower()
    print(f"Stats: {proxy.requests} requests, {proxy.remote_fetches} remote fetches, real store created: {created}")


if __name__ == "__main__":
    main()
