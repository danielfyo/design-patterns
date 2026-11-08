"""Factory Method pattern: a notification service whose subclasses decide
which notifier (product) to create.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class User:
    """The person we want to reach. Each channel uses a different address."""

    name: str
    email: str
    phone: str
    device_id: str


class Notifier(Protocol):
    """Product: the common interface of everything the factory method can create."""

    def send(self, recipient: User, message: str) -> str: ...


class EmailNotifier:
    """Concrete Product: delivers the message by e-mail."""

    def send(self, recipient: User, message: str) -> str:
        return f'EMAIL to {recipient.email}: "{message}"'


class SmsNotifier:
    """Concrete Product: delivers the message by SMS, which has a length limit."""

    MAX_LENGTH = 32

    def send(self, recipient: User, message: str) -> str:
        limit = self.MAX_LENGTH
        text = message[: limit - 3] + "..." if len(message) > limit else message
        return f'SMS to {recipient.phone}: "{text}"'


class PushNotifier:
    """Concrete Product: delivers the message as a mobile push notification."""

    def send(self, recipient: User, message: str) -> str:
        return f'PUSH to {recipient.device_id}: "{message}"'


class NotificationService(ABC):
    """Creator: declares the factory method and holds the business logic using it."""

    name: str

    @abstractmethod
    def create_notifier(self) -> Notifier:
        """The factory method. Subclasses decide which concrete notifier to build."""

    def notify(self, user: User, message: str) -> str:
        """Business logic shared by every channel: validate, personalize, deliver."""
        if not message.strip():
            raise ValueError("message must not be empty")
        notifier = self.create_notifier()
        return notifier.send(user, f"Hi {user.name}, {message}")


class EmailService(NotificationService):
    """Concrete Creator: returns an EmailNotifier."""

    name = "EmailService"

    def create_notifier(self) -> Notifier:
        return EmailNotifier()


class SmsService(NotificationService):
    """Concrete Creator: returns an SmsNotifier."""

    name = "SmsService"

    def create_notifier(self) -> Notifier:
        return SmsNotifier()


class PushService(NotificationService):
    """Concrete Creator: returns a PushNotifier."""

    name = "PushService"

    def create_notifier(self) -> Notifier:
        return PushNotifier()


# NOT the GoF pattern: a "simple factory" mapping a config string to a creator class.
# Classes are first-class objects in Python, so a dict replaces the switch.
SERVICES: dict[str, type[NotificationService]] = {
    "email": EmailService,
    "sms": SmsService,
    "push": PushService,
}


def service_from_config(channel: str) -> NotificationService:
    try:
        return SERVICES[channel]()
    except KeyError:
        raise ValueError(f'unknown notification channel "{channel}"') from None


def send_shipping_update(service: NotificationService, user: User) -> None:
    """Client code: it only knows the abstract creator, never a concrete notifier."""
    print(f"  {service.name:<12} -> {service.notify(user, 'your order #1001 has shipped.')}")


def main() -> None:
    print("=== Factory Method Pattern: Notification service ===")

    alice = User("Alice", "alice@example.com", "+1-555-0100", "device-a1b2")
    bob = User("Bob", "bob@example.com", "+1-555-0199", "device-c3d4")

    print("Client code works only with the abstract NotificationService:")
    services: list[NotificationService] = [EmailService(), SmsService(), PushService()]
    for service in services:
        send_shipping_update(service, alice)

    print("Config-driven selection (a simple factory picks the creator):")
    for channel in ["push", "email", "fax"]:
        try:
            service = service_from_config(channel)
            print(f"  channel={channel:<6} -> {service.name}")
            print(f"    {service.notify(bob, 'your password was changed.')}")
        except ValueError as err:
            print(f"  channel={channel:<6} -> error: {err}")

    print("Shared business rules live in the creator:")
    sms: NotificationService = SmsService()
    try:
        sms.notify(alice, "   ")
    except ValueError as err:
        print(f"  {sms.name:<12} -> error: {err}")


if __name__ == "__main__":
    main()
