"""Mediator pattern: a chat room routes messages between participants.

Run with:  python3 main.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol


class ChatMediator(Protocol):
    """The Mediator interface: the only thing participants know about. All
    communication goes through it, so participants never reference each other."""

    def register(self, participant: Participant) -> None: ...

    def send(self, message: str, sender: Participant) -> None: ...

    def send_direct(self, message: str, sender: Participant, to: str) -> None: ...


class Participant(ABC):
    """The Colleague base class: knows its mediator, not the other participants.
    Recipients of a direct message are addressed by name, not by reference."""

    def __init__(self, name: str) -> None:
        self.name = name
        self.mediator: ChatMediator | None = None  # set by the mediator on register

    def _room(self) -> ChatMediator:
        if self.mediator is None:
            raise RuntimeError(f"{self.name} has not joined a room.")
        return self.mediator

    def send(self, message: str) -> None:
        self._room().send(message, self)

    def send_to(self, recipient: str, message: str) -> None:
        self._room().send_direct(message, self, recipient)

    @abstractmethod
    def receive(self, sender: str, message: str, is_private: bool) -> None: ...


class User(Participant):
    """Concrete Colleague: a human user who prints what they receive."""

    def receive(self, sender: str, message: str, is_private: bool) -> None:
        tag = " (private)" if is_private else ""
        print(f"  [{self.name}] {sender}{tag}: {message}")


class Bot(Participant):
    """Concrete Colleague: a bot that silently listens and answers "!help" with a
    private message. Adding it required no change to ``User``."""

    def receive(self, sender: str, message: str, is_private: bool) -> None:
        if message.strip() == "!help":
            self.send_to(
                sender, f"Hi {sender}! Commands: !help. Private messages reach one person only."
            )


class ChatRoom:
    """Concrete Mediator: owns the list of participants and the routing rules
    (broadcast, direct messages, unknown recipients)."""

    def __init__(self) -> None:
        self._participants: list[Participant] = []

    def register(self, participant: Participant) -> None:
        participant.mediator = self
        self._participants.append(participant)
        print(f"[room] {participant.name} joined")

    def send(self, message: str, sender: Participant) -> None:
        print(f"{sender.name} -> everyone: {message}")
        for participant in list(self._participants):
            if participant is not sender:
                participant.receive(sender.name, message, is_private=False)

    def send_direct(self, message: str, sender: Participant, to: str) -> None:
        print(f"{sender.name} -> {to} (private): {message}")
        recipient = next((p for p in self._participants if p.name == to), None)
        if recipient is None:
            print(f"[room] {to} is not in this room")
            return
        recipient.receive(sender.name, message, is_private=True)


def main() -> None:
    print("=== Mediator Pattern: Chat room ===")

    room: ChatMediator = ChatRoom()
    alice, bob, carol = User("alice"), User("bob"), User("carol")

    # Participants only get to know the room, never each other.
    room.register(alice)
    room.register(bob)
    room.register(carol)
    room.register(Bot("HelpBot"))

    alice.send("Hi everyone!")
    bob.send("Welcome, alice!")
    carol.send("!help")  # the bot reacts through the room
    bob.send_to("carol", "Lunch at 1pm?")
    carol.send_to("bob", "Sure!")
    alice.send_to("dave", "Are you there?")  # the room decides what to do


if __name__ == "__main__":
    main()
