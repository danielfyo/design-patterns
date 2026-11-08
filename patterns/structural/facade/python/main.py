"""Facade pattern: one simple ``place_order`` call in front of four subsystems.

Run with:  python3 main.py
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Customer:
    name: str
    email: str


@dataclass(frozen=True)
class OrderItem:
    sku: str
    quantity: int


@dataclass(frozen=True)
class OrderResult:
    """What the facade returns: one simple value instead of four subsystem results."""

    success: bool
    total: Decimal = Decimal("0")
    tracking: str | None = None
    error: str | None = None


class InventoryService:
    """Subsystem class: knows prices and stock levels, and reserves/releases units."""

    def __init__(self) -> None:
        self._prices = {
            "keyboard": Decimal("79.99"),
            "mouse": Decimal("29.99"),
            "monitor": Decimal("199.00"),
            "webcam": Decimal("49.50"),
        }
        self._stock = {"keyboard": 10, "mouse": 5, "monitor": 5, "webcam": 3}

    def price_of(self, sku: str) -> Decimal:
        return self._prices[sku]

    def stock_of(self, sku: str) -> int:
        return self._stock[sku]

    def is_available(self, sku: str, quantity: int) -> bool:
        in_stock = self._stock[sku]
        ok = in_stock >= quantity
        if ok:
            print(f"  [inventory] check {sku} x{quantity}: ok ({in_stock} in stock)")
        else:
            print(f"  [inventory] check {sku} x{quantity}: only {in_stock} in stock")
        return ok

    def reserve(self, sku: str, quantity: int) -> None:
        self._stock[sku] -= quantity
        print(f"  [inventory] reserved {sku} x{quantity}")

    def release(self, sku: str, quantity: int) -> None:
        self._stock[sku] += quantity
        print(f"  [inventory] released {sku} x{quantity} (rollback)")


class PaymentService:
    """Subsystem class: charges and refunds cards (simulated payment gateway)."""

    def __init__(self) -> None:
        self._next_transaction = 1001

    def charge(self, card_number: str, amount: Decimal) -> str:
        transaction_id = f"TXN-{self._next_transaction}"
        self._next_transaction += 1
        print(f"  [payment] charged ${amount:.2f} to card ending {card_number[-4:]} ({transaction_id})")
        return transaction_id

    def refund(self, transaction_id: str, amount: Decimal) -> None:
        print(f"  [payment] refunded ${amount:.2f} ({transaction_id})")


class ShippingService:
    """Subsystem class: books shipments with the carrier."""

    def __init__(self) -> None:
        self._next_shipment = 5001

    def create_shipment(self, customer: Customer, items: list[OrderItem]) -> str:
        tracking = f"SHP-{self._next_shipment}"
        self._next_shipment += 1
        units = sum(i.quantity for i in items)
        print(f"  [shipping] shipment {tracking} created for {customer.name} ({units} items)")
        return tracking


class NotificationService:
    """Subsystem class: sends e-mails to customers."""

    def send_email(self, to: str, message: str) -> None:
        print(f"  [email] to {to}: {message}")


class OrderFacade:
    """The Facade: one simple entry point for "place an order".

    It knows which subsystems to call, in which order, and how to undo partial
    work when a step fails. Clients no longer orchestrate the subsystems.
    """

    def __init__(
        self,
        inventory: InventoryService,
        payment: PaymentService,
        shipping: ShippingService,
        notification: NotificationService,
    ) -> None:
        self._inventory = inventory
        self._payment = payment
        self._shipping = shipping
        self._notification = notification

    def place_order(self, customer: Customer, items: list[OrderItem], card_number: str) -> OrderResult:
        # 1-2. Check stock and reserve each item; roll back earlier reservations on failure.
        reserved: list[OrderItem] = []
        for item in items:
            if not self._inventory.is_available(item.sku, item.quantity):
                for r in reserved:
                    self._inventory.release(r.sku, r.quantity)
                self._notification.send_email(customer.email, f"Order failed: {item.sku} is out of stock")
                available = self._inventory.stock_of(item.sku)
                return OrderResult(
                    success=False,
                    error=f"{item.sku} is out of stock (requested {item.quantity}, available {available})",
                )
            self._inventory.reserve(item.sku, item.quantity)
            reserved.append(item)

        # 3. Charge the card.
        total = sum((self._inventory.price_of(i.sku) * i.quantity for i in items), Decimal("0"))
        self._payment.charge(card_number, total)

        # 4. Create the shipment.
        tracking = self._shipping.create_shipment(customer, items)

        # 5. Tell the customer.
        self._notification.send_email(customer.email, f"Order confirmed, total ${total:.2f}, tracking {tracking}")
        return OrderResult(success=True, total=total, tracking=tracking)


def main() -> None:
    print("=== Facade Pattern: E-commerce order placement ===")

    inventory = InventoryService()
    shop = OrderFacade(inventory, PaymentService(), ShippingService(), NotificationService())

    # The client makes ONE call per order; the facade does the orchestration.
    def place_and_report(number: int, customer: Customer, items: list[OrderItem]) -> None:
        listing = ", ".join(f"{i.quantity} x {i.sku}" for i in items)
        print(f"Order {number}: {customer.name} buys {listing}")
        result = shop.place_order(customer, items, "4242 4242 4242 4242")
        if result.success:
            print(f"Result: success=true, total=${result.total:.2f}, tracking={result.tracking}")
        else:
            print(f"Result: success=false, error={result.error}")

    place_and_report(1, Customer("Alice", "alice@example.com"), [OrderItem("keyboard", 2), OrderItem("mouse", 1)])
    print()
    place_and_report(2, Customer("Bob", "bob@example.com"), [OrderItem("monitor", 1), OrderItem("webcam", 5)])
    print()

    skus = ["keyboard", "mouse", "monitor", "webcam"]
    print("Stock after both orders: " + ", ".join(f"{s}={inventory.stock_of(s)}" for s in skus))


if __name__ == "__main__":
    main()
