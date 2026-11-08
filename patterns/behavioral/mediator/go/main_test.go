package main

import (
	"bytes"
	"io"
	"os"
	"slices"
	"strings"
	"testing"
)

type message struct {
	from, text string
	private    bool
}

// recorder is a colleague that records what the room delivers to it.
type recorder struct {
	member
	inbox []message
}

func newRecorder(name string) *recorder {
	r := &recorder{member: member{name: name}}
	r.self = r
	return r
}

func (r *recorder) Receive(from, text string, private bool) {
	r.inbox = append(r.inbox, message{from, text, private})
}

func roomWith(names ...string) (*ChatRoom, []*recorder) {
	room := &ChatRoom{}
	members := make([]*recorder, len(names))
	for i, name := range names {
		members[i] = newRecorder(name)
		room.Register(members[i])
	}
	return room, members
}

func TestBroadcastReachesEveryoneExceptTheSender(t *testing.T) {
	captureStdout(t, func() {
		_, m := roomWith("alice", "bob", "carol")

		m[0].Send("hi")

		if len(m[0].inbox) != 0 {
			t.Errorf("sender received %v", m[0].inbox)
		}
		want := []message{{"alice", "hi", false}}
		for _, r := range m[1:] {
			if !slices.Equal(r.inbox, want) {
				t.Errorf("%s inbox = %v, want %v", r.name, r.inbox, want)
			}
		}
	})
}

func TestDirectMessageReachesOnlyTheNamedRecipient(t *testing.T) {
	captureStdout(t, func() {
		_, m := roomWith("alice", "bob", "carol")

		m[1].SendTo("carol", "lunch?")

		if want := []message{{"bob", "lunch?", true}}; !slices.Equal(m[2].inbox, want) {
			t.Errorf("carol inbox = %v, want %v", m[2].inbox, want)
		}
		if len(m[0].inbox)+len(m[1].inbox) != 0 {
			t.Errorf("others received messages: alice %v, bob %v", m[0].inbox, m[1].inbox)
		}
	})
}

func TestUnknownRecipientIsHandledByTheRoom(t *testing.T) {
	var bob *recorder
	out := captureStdout(t, func() {
		_, m := roomWith("alice", "bob")
		bob = m[1]
		m[0].SendTo("dave", "there?")
	})

	if len(bob.inbox) != 0 {
		t.Errorf("bob inbox = %v", bob.inbox)
	}
	if want := "alice -> dave (private): there?\n[room] dave is not in this room\n"; !strings.HasSuffix(out, want) {
		t.Errorf("output = %q, want suffix %q", out, want)
	}
}

func TestBotAnswersHelpPrivatelyThroughTheRoom(t *testing.T) {
	captureStdout(t, func() {
		room, m := roomWith("alice", "bob", "carol")
		room.Register(NewBot("HelpBot"))

		m[2].Send(" !help ")

		if len(m[2].inbox) != 1 {
			t.Fatalf("carol inbox = %v, want one reply", m[2].inbox)
		}
		reply := m[2].inbox[0]
		if reply.from != "HelpBot" || !reply.private || !strings.HasPrefix(reply.text, "Hi carol!") {
			t.Errorf("reply = %+v", reply)
		}
		for _, r := range m[:2] {
			if slices.ContainsFunc(r.inbox, func(msg message) bool { return msg.from == "HelpBot" }) {
				t.Errorf("%s received the bot reply", r.name)
			}
		}
	})
}

func TestBotIgnoresOrdinaryMessages(t *testing.T) {
	captureStdout(t, func() {
		room, m := roomWith("alice")
		room.Register(NewBot("HelpBot"))

		m[0].Send("help me")

		if len(m[0].inbox) != 0 {
			t.Errorf("alice inbox = %v, want empty", m[0].inbox)
		}
	})
}

func TestUserPrintsWhatItReceivesAndTagsPrivateMessages(t *testing.T) {
	out := captureStdout(t, func() {
		room := &ChatRoom{}
		alice, bob := NewUser("alice"), NewUser("bob")
		room.Register(alice)
		room.Register(bob)

		alice.Send("hi")
		alice.SendTo("bob", "psst")
	})

	want := "[room] alice joined\n[room] bob joined\n" +
		"alice -> everyone: hi\n  [bob] alice: hi\n" +
		"alice -> bob (private): psst\n  [bob] alice (private): psst\n"
	if out != want {
		t.Errorf("output = %q, want %q", out, want)
	}
}

func TestDemoPrintsTheExpectedOutput(t *testing.T) {
	want, err := os.ReadFile("../expected_output.txt")
	if err != nil {
		t.Fatal(err)
	}
	if got := captureStdout(t, main); got != string(want) {
		t.Errorf("output mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

// captureStdout runs fn and returns everything it printed to os.Stdout.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	original := os.Stdout
	os.Stdout = w
	defer func() { os.Stdout = original }()

	fn()
	_ = w.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}
