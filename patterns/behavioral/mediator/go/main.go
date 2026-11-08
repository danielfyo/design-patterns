// Mediator pattern: a chat room routes messages between participants.
//
// Run with: go run ./patterns/behavioral/mediator/go
package main

import (
	"fmt"
	"strings"
)

// ChatMediator is the Mediator interface: the only thing participants know
// about. All communication goes through it.
type ChatMediator interface {
	Register(p Participant)
	Send(message string, from Participant)
	SendDirect(message string, from Participant, to string)
}

// Participant is the Colleague interface seen by the mediator.
type Participant interface {
	Name() string
	Receive(from, message string, private bool)
	join(m ChatMediator)
}

// member holds what every colleague shares: a name and a mediator. Concrete
// colleagues embed it, so they get Send/SendTo for free. Recipients are
// addressed by name, never by reference.
type member struct {
	name     string
	mediator ChatMediator
	self     Participant // the embedding colleague, passed to the mediator as sender
}

func (m *member) Name() string { return m.name }

func (m *member) join(med ChatMediator) { m.mediator = med }

// room returns the participant's mediator. Using a participant that never joined a room is a
// programming error, so it panics with a clear message (the other languages raise an exception).
func (m *member) room() ChatMediator {
	if m.mediator == nil {
		panic(fmt.Sprintf("%s has not joined a room.", m.name))
	}
	return m.mediator
}

func (m *member) Send(message string) { m.room().Send(message, m.self) }

func (m *member) SendTo(recipient, message string) {
	m.room().SendDirect(message, m.self, recipient)
}

// User is a Concrete Colleague: a human user who prints what they receive.
type User struct{ member }

// NewUser creates a user that is not yet in any room.
func NewUser(name string) *User {
	u := &User{member{name: name}}
	u.self = u
	return u
}

func (u *User) Receive(from, message string, private bool) {
	tag := ""
	if private {
		tag = " (private)"
	}
	fmt.Printf("  [%s] %s%s: %s\n", u.name, from, tag, message)
}

// Bot is a Concrete Colleague that silently listens and answers "!help" with a
// private message. Adding it required no change to User.
type Bot struct{ member }

// NewBot creates a bot that is not yet in any room.
func NewBot(name string) *Bot {
	b := &Bot{member{name: name}}
	b.self = b
	return b
}

func (b *Bot) Receive(from, message string, _ bool) {
	if strings.TrimSpace(message) == "!help" {
		b.SendTo(from, fmt.Sprintf("Hi %s! Commands: !help. Private messages reach one person only.", from))
	}
}

// ChatRoom is the Concrete Mediator: it owns the participants and the routing
// rules (broadcast, direct messages, unknown recipients).
type ChatRoom struct {
	participants []Participant
}

func (r *ChatRoom) Register(p Participant) {
	p.join(r)
	r.participants = append(r.participants, p)
	fmt.Printf("[room] %s joined\n", p.Name())
}

func (r *ChatRoom) Send(message string, from Participant) {
	fmt.Printf("%s -> everyone: %s\n", from.Name(), message)
	for _, p := range append([]Participant(nil), r.participants...) {
		if p != from {
			p.Receive(from.Name(), message, false)
		}
	}
}

func (r *ChatRoom) SendDirect(message string, from Participant, to string) {
	fmt.Printf("%s -> %s (private): %s\n", from.Name(), to, message)
	for _, p := range r.participants {
		if p.Name() == to {
			p.Receive(from.Name(), message, true)
			return
		}
	}
	fmt.Printf("[room] %s is not in this room\n", to)
}

func main() {
	fmt.Println("=== Mediator Pattern: Chat room ===")

	var room ChatMediator = &ChatRoom{}
	alice, bob, carol := NewUser("alice"), NewUser("bob"), NewUser("carol")

	// Participants only get to know the room, never each other.
	room.Register(alice)
	room.Register(bob)
	room.Register(carol)
	room.Register(NewBot("HelpBot"))

	alice.Send("Hi everyone!")
	bob.Send("Welcome, alice!")
	carol.Send("!help") // the bot reacts through the room
	bob.SendTo("carol", "Lunch at 1pm?")
	carol.SendTo("bob", "Sure!")
	alice.SendTo("dave", "Are you there?") // the room decides what to do
}
