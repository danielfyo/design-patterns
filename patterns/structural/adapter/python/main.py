"""Adapter pattern: plugging an incompatible third-party payment SDK into our checkout.

Run with:  python3 main.py
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol


@dataclass(frozen=True)
class PaymentResult:
    """Outcome of a payment, in the application's own vocabulary."""

    success: bool
    transaction_id: str | None
    message: str


class PaymentProcessor(Protocol):
    """Target: the interface the application wants (decimal amounts, ISO currencies)."""

    @property
    def name(self) -> str: ...

    def pay(self, amount: Decimal, currency: str) -> PaymentResult: ...


class InternalWalletProcessor:
    """A native implementation of the Target: our own wallet needs no adapter."""

    name = "Internal wallet"

    def __init__(self, balance: Decimal) -> None:
        self._balance = balance
        self._next_id = 1

    def pay(self, amount: Decimal, currency: str) -> PaymentResult:
        if amount > self._balance:
            print(f"    [wallet] insufficient balance: {self._balance:.2f} < {amount:.2f}")
            return PaymentResult(False, None, "Insufficient wallet balance")
        before = self._balance
        self._balance -= amount
        print(f"    [wallet] debit {amount:.2f} {currency} (balance {before:.2f} -> {self._balance:.2f})")
        transaction_id = f"WAL-{self._next_id:04d}"
        self._next_id += 1
        return PaymentResult(True, transaction_id, "Paid from wallet")


class LegacyPayProSdk:
    """Adaptee: a (fictional) third-party SDK we cannot change.

    Its API is incompatible with ours: integer cents, a merchant id on every call,
    and a ``"code|reference"`` string as the response.
    """

    _MAX_AMOUNT_IN_CENTS = 50_000
    _SUPPORTED_CURRENCIES = ("USD", "EUR")

    def __init__(self) -> None:
        self._next_reference = 1

    def makeTransaction(self, amountInCents: int, currencyCode: str, merchantId: str) -> str:  # noqa: N802, N803
        """Return "00|PP-000001" on success, "14|" unsupported currency, "51|" over the limit.

        The camelCase names are deliberate: they mimic a foreign SDK whose style we do not control.
        """
        if currencyCode not in self._SUPPORTED_CURRENCIES:
            response = "14|"
        elif amountInCents > self._MAX_AMOUNT_IN_CENTS:
            response = "51|"
        else:
            response = f"00|PP-{self._next_reference:06d}"
            self._next_reference += 1
        print(f'    [paypro-sdk] makeTransaction({amountInCents}, "{currencyCode}", "{merchantId}") -> "{response}"')
        return response


class PayProAdapter:
    """Adapter (object adapter): implements the Target by wrapping an Adaptee instance.

    It translates dollars to cents on the way in and status codes to PaymentResult on the way out.
    """

    name = "PayPro (adapted)"

    _MESSAGES = {
        "14": "Currency not supported by PayPro",
        "51": "Declined: amount over limit",
    }

    def __init__(self, sdk: LegacyPayProSdk, merchant_id: str) -> None:
        self._sdk = sdk
        self._merchant_id = merchant_id

    def pay(self, amount: Decimal, currency: str) -> PaymentResult:
        cents = int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        print(f"    [adapter] {amount:.2f} {currency} -> {cents} cents, merchant {self._merchant_id}")

        code, reference = self._sdk.makeTransaction(cents, currency, self._merchant_id).split("|")
        if code == "00":
            return PaymentResult(True, reference, "Approved")
        return PaymentResult(False, None, self._MESSAGES.get(code, f"Unknown PayPro status {code}"))


class CheckoutService:
    """Client: only knows PaymentProcessor, so any gateway (native or adapted) plugs in."""

    def __init__(self, processor: PaymentProcessor) -> None:
        self._processor = processor

    def checkout(self, order_id: str, amount: Decimal, currency: str) -> PaymentResult:
        print(f"  Order {order_id}: {amount:.2f} {currency}")
        result = self._processor.pay(amount, currency)
        print(
            f"    result: success={str(result.success).lower()}, "
            f"id={result.transaction_id or '-'}, message={result.message}"
        )
        return result


def main() -> None:
    print("=== Adapter Pattern: Payment gateway integration ===")

    # The wallet implements PaymentProcessor natively; the legacy SDK is wrapped by an adapter.
    wallet = InternalWalletProcessor(Decimal("100.00"))
    pay_pro = PayProAdapter(LegacyPayProSdk(), "MERCHANT-42")

    runs: list[tuple[PaymentProcessor, list[tuple[str, Decimal, str]]]] = [
        (wallet, [("A-1001", Decimal("49.99"), "USD"), ("A-1002", Decimal("75.00"), "USD")]),
        (
            pay_pro,
            [
                ("A-1003", Decimal("49.99"), "USD"),
                ("A-1004", Decimal("19.50"), "GBP"),
                ("A-1005", Decimal("750.00"), "USD"),
            ],
        ),
    ]

    for processor, orders in runs:
        print(f"Checkout with {processor.name}")
        # The same CheckoutService code runs against both processors.
        checkout = CheckoutService(processor)
        for order_id, amount, currency in orders:
            checkout.checkout(order_id, amount, currency)


if __name__ == "__main__":
    main()
