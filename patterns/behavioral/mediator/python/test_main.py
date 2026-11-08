"""Tests for the Mediator example: routing rules live in the room, not in the colleagues."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

Message = tuple[str, str, bool]


def recorder(example: ModuleType, name: str) -> Any:
    """A colleague that records what the room delivers to it."""

    def receive(self: Any, sender: str, message: str, is_private: bool) -> None:
        self.inbox.append((sender, message, is_private))

    cls = type("Recorder", (example.Participant,), {"receive": receive})
    participant = cls(name)
    participant.inbox = []
    return participant


def room_with(example: ModuleType, *names: str) -> tuple[Any, list[Any]]:
    room = example.ChatRoom()
    members = [recorder(example, name) for name in names]
    for member in members:
        room.register(member)
    return room, members


def test_broadcast_reaches_everyone_except_the_sender(example: ModuleType) -> None:
    _, (alice, bob, carol) = room_with(example, "alice", "bob", "carol")

    alice.send("hi")

    assert alice.inbox == []
    assert bob.inbox == [("alice", "hi", False)]
    assert carol.inbox == [("alice", "hi", False)]


def test_direct_message_reaches_only_the_named_recipient(example: ModuleType) -> None:
    _, (alice, bob, carol) = room_with(example, "alice", "bob", "carol")

    bob.send_to("carol", "lunch?")

    assert carol.inbox == [("bob", "lunch?", True)]
    assert alice.inbox == []
    assert bob.inbox == []


def test_unknown_recipient_is_handled_by_the_room(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    _, (alice, bob) = room_with(example, "alice", "bob")

    alice.send_to("dave", "there?")

    assert bob.inbox == []
    assert capsys.readouterr().out.endswith(
        "alice -> dave (private): there?\n[room] dave is not in this room\n"
    )


def test_participant_cannot_send_before_joining_a_room(example: ModuleType) -> None:
    loner = recorder(example, "loner")

    with pytest.raises(RuntimeError, match=r"loner has not joined a room\."):
        loner.send("hello?")
    with pytest.raises(RuntimeError):
        loner.send_to("bob", "hello?")


def test_bot_answers_help_privately_through_the_room(example: ModuleType) -> None:
    room, (alice, bob, carol) = room_with(example, "alice", "bob", "carol")
    room.register(example.Bot("HelpBot"))

    carol.send(" !help ")

    [(sender, message, is_private)] = carol.inbox
    assert (sender, is_private) == ("HelpBot", True)
    assert message.startswith("Hi carol!")
    assert all(m[0] != "HelpBot" for m in alice.inbox + bob.inbox)


def test_bot_ignores_ordinary_messages(example: ModuleType) -> None:
    room, (alice,) = room_with(example, "alice")
    room.register(example.Bot("HelpBot"))

    alice.send("help me")

    assert alice.inbox == []


def test_user_prints_what_it_receives_and_tags_private_messages(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    room = example.ChatRoom()
    alice, bob = example.User("alice"), example.User("bob")
    room.register(alice)
    room.register(bob)

    alice.send("hi")
    alice.send_to("bob", "psst")

    assert capsys.readouterr().out == (
        "[room] alice joined\n[room] bob joined\n"
        "alice -> everyone: hi\n  [bob] alice: hi\n"
        "alice -> bob (private): psst\n  [bob] alice (private): psst\n"
    )


def test_demo_prints_the_expected_output(
    example: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    example.main()

    expected = Path(__file__).parents[1] / "expected_output.txt"
    assert capsys.readouterr().out == expected.read_text(encoding="utf-8")
