"""Tests for the Adapter example: the adapter translates both ways, the client never notices."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

MERCHANT = "MERCHANT-42"


def new_adapter(example: ModuleType) -> Any:
    return example.PayProAdapter(example.LegacyPayProSdk(), MERCHANT)


def test_adapter_translates_dollars_to_cents_and_adds_the_merchant_id(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    new_adapter(example).pay(Decimal("49.99"), "USD")

    assert (
        '[paypro-sdk] makeTransaction(4999, "USD", "MERCHANT-42") -> "00|PP-000001"'
        in capsys.readouterr().out
    )


def test_adapter_rounds_half_cents_away_from_zero(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    new_adapter(example).pay(Decimal("10.125"), "USD")

    assert "makeTransaction(1013, " in capsys.readouterr().out


def test_approved_code_becomes_a_successful_result_with_the_sdk_reference(
    example: ModuleType,
) -> None:
    adapter = new_adapter(example)

    first = adapter.pay(Decimal("10"), "USD")
    second = adapter.pay(Decimal("10"), "EUR")

    assert first == example.PaymentResult(True, "PP-000001", "Approved")
    assert second == example.PaymentResult(True, "PP-000002", "Approved")


@pytest.mark.parametrize(
    ("amount", "currency", "message"),
    [
        ("19.50", "GBP", "Currency not supported by PayPro"),
        ("750.00", "USD", "Declined: amount over limit"),
    ],
)
def test_error_codes_become_failed_results_with_a_readable_message(
    example: ModuleType, amount: str, currency: str, message: str
) -> None:
    result = new_adapter(example).pay(Decimal(amount), currency)

    assert result == example.PaymentResult(False, None, message)


def test_amount_exactly_at_the_sdk_limit_is_still_approved(example: ModuleType) -> None:
    assert new_adapter(example).pay(Decimal("500.00"), "USD").success


def test_unknown_sdk_codes_are_reported_instead_of_crashing(example: ModuleType) -> None:
    class BrokenSdk:
        """Stands in for an SDK version that answers with a code the adapter has never seen."""

        def makeTransaction(self, amountInCents: int, currencyCode: str, merchantId: str) -> str:  # noqa: N802, N803
            return "99|"

    result = example.PayProAdapter(BrokenSdk(), MERCHANT).pay(Decimal("1"), "USD")

    assert result == example.PaymentResult(False, None, "Unknown PayPro status 99")


def test_wallet_debits_its_balance_and_rejects_payments_it_cannot_cover(
    example: ModuleType,
) -> None:
    wallet = example.InternalWalletProcessor(Decimal("100"))

    paid = wallet.pay(Decimal("49.99"), "USD")
    rejected = wallet.pay(Decimal("75"), "USD")
    exact = wallet.pay(Decimal("50.01"), "USD")

    assert paid == example.PaymentResult(True, "WAL-0001", "Paid from wallet")
    assert rejected == example.PaymentResult(False, None, "Insufficient wallet balance")
    assert exact == example.PaymentResult(True, "WAL-0002", "Paid from wallet")


def test_checkout_only_depends_on_the_target_interface(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    calls: list[tuple[Decimal, str]] = []

    class RecordingProcessor:
        name = "Recording"

        def pay(self, amount: Decimal, currency: str) -> Any:
            calls.append((amount, currency))
            return example.PaymentResult(True, "REC-1", "Recorded")

    result = example.CheckoutService(RecordingProcessor()).checkout("A-1", Decimal("12.50"), "EUR")

    assert calls == [(Decimal("12.50"), "EUR")]
    assert result.transaction_id == "REC-1"
    assert capsys.readouterr().out == (
        "  Order A-1: 12.50 EUR\n    result: success=true, id=REC-1, message=Recorded\n"
    )


def test_checkout_runs_unchanged_against_the_adapted_sdk(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    result = example.CheckoutService(new_adapter(example)).checkout(
        "A-1004", Decimal("19.50"), "GBP"
    )

    assert not result.success
    assert capsys.readouterr().out == (
        "  Order A-1004: 19.50 GBP\n"
        "    [adapter] 19.50 GBP -> 1950 cents, merchant MERCHANT-42\n"
        '    [paypro-sdk] makeTransaction(1950, "GBP", "MERCHANT-42") -> "14|"\n'
        "    result: success=false, id=-, message=Currency not supported by PayPro\n"
    )


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
