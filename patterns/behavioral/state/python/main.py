"""State pattern: an order whose behavior changes with its lifecycle state.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class Order:
    """The Context: delegates every action to its current state object.

    There is no ``if status == ...`` chain: the state decides what happens.
    """

    def __init__(self, order_id: int) -> None:
        self.id = order_id
        self._state: OrderState = PendingState()

    @property
    def state(self) -> OrderState:
        return self._state

    def pay(self) -> None:
        print("> pay()")
        self._state.pay(self)

    def ship(self) -> None:
        print("> ship()")
        self._state.ship(self)

    def deliver(self) -> None:
        print("> deliver()")
        self._state.deliver(self)

    def cancel(self) -> None:
        print("> cancel()")
        self._state.cancel(self)

    def transition_to(self, next_state: OrderState, note: str) -> None:
        """Called by the states themselves: states know their successors."""
        print(f"  {note}: {self._state.name} -> {next_state.name}")
        self._state = next_state


class OrderState(ABC):
    """The State: one method per action; concrete states decide what is valid."""

    name: str

    @abstractmethod
    def pay(self, order: Order) -> None: ...

    @abstractmethod
    def ship(self, order: Order) -> None: ...

    @abstractmethod
    def deliver(self, order: Order) -> None: ...

    @abstractmethod
    def cancel(self, order: Order) -> None: ...

    @staticmethod
    def reject(reason: str) -> None:
        """Shared helper for invalid actions: the state stays the same."""
        print(f"  ERROR: {reason}")


class PendingState(OrderState):
    """Concrete State: created but not paid yet."""

    name = "Pending"

    def pay(self, order: Order) -> None:
        order.transition_to(PaidState(), "Payment accepted")

    def ship(self, order: Order) -> None:
        self.reject("Cannot ship an order that has not been paid")

    def deliver(self, order: Order) -> None:
        self.reject("Cannot deliver an order that has not been shipped")

    def cancel(self, order: Order) -> None:
        order.transition_to(CancelledState(), "Order cancelled, nothing to refund")


class PaidState(OrderState):
    """Concrete State: paid and waiting to be shipped."""

    name = "Paid"

    def pay(self, order: Order) -> None:
        self.reject("Order has already been paid")

    def ship(self, order: Order) -> None:
        order.transition_to(ShippedState(), "Order handed to the carrier")

    def deliver(self, order: Order) -> None:
        self.reject("Cannot deliver an order that has not been shipped")

    def cancel(self, order: Order) -> None:
        order.transition_to(CancelledState(), "Order cancelled, payment refunded")


class ShippedState(OrderState):
    """Concrete State: on its way to the customer."""

    name = "Shipped"

    def pay(self, order: Order) -> None:
        self.reject("Order has already been paid")

    def ship(self, order: Order) -> None:
        self.reject("Order has already been shipped")

    def deliver(self, order: Order) -> None:
        order.transition_to(DeliveredState(), "Order delivered to the customer")

    def cancel(self, order: Order) -> None:
        self.reject("Cannot cancel an order that has already been shipped")


class DeliveredState(OrderState):
    """Concrete State: final state, every action is rejected."""

    name = "Delivered"

    def pay(self, order: Order) -> None:
        self.reject("Order has already been paid")

    def ship(self, order: Order) -> None:
        self.reject("Order has already been delivered")

    def deliver(self, order: Order) -> None:
        self.reject("Order has already been delivered")

    def cancel(self, order: Order) -> None:
        self.reject("Cannot cancel a delivered order")


class CancelledState(OrderState):
    """Concrete State: final state reached by cancelling."""

    name = "Cancelled"

    def pay(self, order: Order) -> None:
        self.reject("Cannot pay for a cancelled order")

    def ship(self, order: Order) -> None:
        self.reject("Cannot ship a cancelled order")

    def deliver(self, order: Order) -> None:
        self.reject("Cannot deliver a cancelled order")

    def cancel(self, order: Order) -> None:
        self.reject("Order is already cancelled")


def main() -> None:
    print("=== State Pattern: Order lifecycle ===")

    # Happy path, plus two actions that the current state rejects.
    print("--- Order #1001: happy path ---")
    first = Order(1001)
    print(f"Order #{first.id} created [{first.state.name}]")
    first.pay()
    first.ship()
    first.cancel()
    first.deliver()
    first.cancel()
    print(f"Order #{first.id} final state: {first.state.name}")

    # Same actions, different results: the behavior depends on the current state.
    print("--- Order #1002: cancellation ---")
    second = Order(1002)
    print(f"Order #{second.id} created [{second.state.name}]")
    second.ship()
    second.pay()
    second.cancel()
    second.deliver()
    print(f"Order #{second.id} final state: {second.state.name}")


if __name__ == "__main__":
    main()
