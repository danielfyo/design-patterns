"""Tests for the Proxy example: lazy creation, caching and protection."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def editor(example: ModuleType) -> Any:
    return example.User("alice", "editor")


def viewer(example: ModuleType) -> Any:
    return example.User("bob", "viewer")


def test_virtual_proxy_does_not_create_the_real_store_until_first_request(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    proxy = example.DocumentStoreProxy()

    assert not proxy.is_real_store_created
    assert capsys.readouterr().out == ""

    proxy.get_document("doc-1", editor(example))

    assert proxy.is_real_store_created


def test_real_store_is_created_only_once(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    proxy = example.DocumentStoreProxy()

    proxy.get_document("doc-1", editor(example))
    proxy.get_document("doc-2", editor(example))

    assert capsys.readouterr().out.count("[remote] connecting") == 1


def test_caching_proxy_fetches_each_document_from_the_remote_store_once(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    proxy = example.DocumentStoreProxy()

    first = proxy.get_document("doc-1", editor(example))
    second = proxy.get_document("doc-1", viewer(example))

    assert first is second
    assert capsys.readouterr().out.count("[remote] fetching doc-1") == 1
    assert proxy.requests == 2
    assert proxy.remote_fetches == 1


def test_protection_proxy_denies_viewers_confidential_documents(example: ModuleType) -> None:
    proxy = example.DocumentStoreProxy()

    with pytest.raises(example.AccessDeniedError, match="viewer cannot read confidential doc-2"):
        proxy.get_document("doc-2", viewer(example))


def test_protection_proxy_lets_editors_read_confidential_documents(example: ModuleType) -> None:
    proxy = example.DocumentStoreProxy()

    doc = proxy.get_document("doc-2", editor(example))

    assert doc == example.Document("doc-2", "Merger plan", "confidential")


def test_protection_is_checked_even_when_the_document_is_cached(example: ModuleType) -> None:
    proxy = example.DocumentStoreProxy()
    proxy.get_document("doc-2", editor(example))

    with pytest.raises(example.AccessDeniedError):
        proxy.get_document("doc-2", viewer(example))

    assert proxy.remote_fetches == 1
    assert proxy.requests == 2


def test_denied_request_still_warms_the_cache(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    proxy = example.DocumentStoreProxy()
    with pytest.raises(example.AccessDeniedError):
        proxy.get_document("doc-2", viewer(example))

    proxy.get_document("doc-2", editor(example))

    assert proxy.remote_fetches == 1
    assert "[proxy] cache hit doc-2" in capsys.readouterr().out


def test_real_subject_performs_no_authorization_of_its_own(example: ModuleType) -> None:
    real = example.RemoteDocumentStore()

    doc = real.get_document("doc-2", viewer(example))

    assert doc.classification == "confidential"


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
