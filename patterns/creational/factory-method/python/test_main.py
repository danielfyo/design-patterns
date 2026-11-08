"""Tests for the Factory Method example: products, creators and the simple factory."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

ALICE = ("Alice", "alice@example.com", "+1-555-0100", "device-a1b2")


@pytest.mark.parametrize(
    ("service_name", "expected"),
    [
        ("EmailService", 'EMAIL to alice@example.com: "Hi Alice, your order shipped."'),
        ("SmsService", 'SMS to +1-555-0100: "Hi Alice, your order shipped."'),
        ("PushService", 'PUSH to device-a1b2: "Hi Alice, your order shipped."'),
    ],
)
def test_each_concrete_creator_delivers_through_its_own_product(
    example: ModuleType, service_name: str, expected: str
) -> None:
    service = getattr(example, service_name)()

    assert service.notify(example.User(*ALICE), "your order shipped.") == expected
    assert service.name == service_name


def test_sms_product_truncates_long_messages_to_the_maximum_length(example: ModuleType) -> None:
    limit = example.SmsNotifier.MAX_LENGTH

    receipt = example.SmsNotifier().send(example.User(*ALICE), "a" * 40)

    assert receipt == f'SMS to +1-555-0100: "{"a" * (limit - 3)}..."'


def test_sms_product_keeps_a_message_that_fits_exactly(example: ModuleType) -> None:
    message = "b" * example.SmsNotifier.MAX_LENGTH

    receipt = example.SmsNotifier().send(example.User(*ALICE), message)

    assert receipt == f'SMS to +1-555-0100: "{message}"'


@pytest.mark.parametrize("message", ["", "   "])
@pytest.mark.parametrize("service_name", ["EmailService", "SmsService", "PushService"])
def test_creator_rejects_a_blank_message_for_every_channel(
    example: ModuleType, service_name: str, message: str
) -> None:
    service = getattr(example, service_name)()

    with pytest.raises(ValueError, match="message must not be empty"):
        service.notify(example.User(*ALICE), message)


class FakeNotifier:
    def send(self, recipient: Any, message: str) -> str:
        return f"FAKE {recipient.name}: {message}"


def make_recording_service(example: ModuleType) -> Any:
    """A concrete creator defined by the test, to prove notify() only uses the factory method."""

    def create_notifier(self: Any) -> FakeNotifier:
        self.created += 1
        return FakeNotifier()

    cls = type(
        "RecordingService",
        (example.NotificationService,),
        {"name": "RecordingService", "created": 0, "create_notifier": create_notifier},
    )
    return cls()


def test_shared_business_logic_works_with_any_product_a_subclass_creates(
    example: ModuleType,
) -> None:
    service = make_recording_service(example)

    assert service.notify(example.User(*ALICE), "hello") == "FAKE Alice: Hi Alice, hello"
    assert service.created == 1


def test_factory_method_is_not_called_when_validation_fails(example: ModuleType) -> None:
    service = make_recording_service(example)

    with pytest.raises(ValueError, match="message must not be empty"):
        service.notify(example.User(*ALICE), " ")

    assert service.created == 0


def test_creator_cannot_be_instantiated_without_a_factory_method(example: ModuleType) -> None:
    with pytest.raises(TypeError):
        example.NotificationService()


@pytest.mark.parametrize(
    ("channel", "service_name"),
    [("email", "EmailService"), ("sms", "SmsService"), ("push", "PushService")],
)
def test_simple_factory_maps_a_channel_name_to_its_creator(
    example: ModuleType, channel: str, service_name: str
) -> None:
    assert type(example.service_from_config(channel)) is getattr(example, service_name)


@pytest.mark.parametrize("channel", ["fax", "Email"])
def test_simple_factory_rejects_unknown_channels(example: ModuleType, channel: str) -> None:
    with pytest.raises(ValueError, match=f'unknown notification channel "{channel}"'):
        example.service_from_config(channel)


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
