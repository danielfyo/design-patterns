package main

import (
	"bytes"
	"io"
	"os"
	"testing"
)

func editorWith(text string) *Editor {
	e := &Editor{}
	e.Type(text)
	return e
}

func TestTypeInsertsAtTheCursorAndMovesIt(t *testing.T) {
	e := editorWith("Hello world")
	e.MoveCursor(5)

	e.Type(" cruel")

	if got := e.Render(); got != "Hello cruel| world" {
		t.Errorf("Render() = %q", got)
	}
	if e.Cursor() != 11 {
		t.Errorf("Cursor() = %d, want 11", e.Cursor())
	}
}

func TestMoveCursorIsClampedToTheText(t *testing.T) {
	tests := []struct{ position, want int }{{-3, 0}, {2, 2}, {99, 5}}
	for _, tt := range tests {
		e := editorWith("Hello")

		e.MoveCursor(tt.position)

		if e.Cursor() != tt.want {
			t.Errorf("MoveCursor(%d): Cursor() = %d, want %d", tt.position, e.Cursor(), tt.want)
		}
	}
}

func TestBackspaceNeverDeletesPastTheStart(t *testing.T) {
	e := editorWith("Hello")
	e.MoveCursor(2)

	e.Backspace(10)

	if e.content != "llo" || e.Cursor() != 0 {
		t.Errorf("content %q, cursor %d; want \"llo\", 0", e.content, e.Cursor())
	}
}

func TestRestoreBringsBackBothTextAndCursor(t *testing.T) {
	e := editorWith("Hello world")
	e.MoveCursor(5)
	snapshot := e.Save()

	e.Type(" cruel")
	e.MoveCursor(0)
	e.Restore(snapshot)

	if e.content != "Hello world" || e.Cursor() != 5 {
		t.Errorf("content %q, cursor %d; want \"Hello world\", 5", e.content, e.Cursor())
	}
}

func TestSnapshotIsUnaffectedByLaterEditsAndCanBeReused(t *testing.T) {
	e := editorWith("Hello")
	snapshot := e.Save()

	e.Type("!!!")
	e.Restore(snapshot)
	e.Backspace(5)
	e.Restore(snapshot)

	if got := e.Render(); got != "Hello|" {
		t.Errorf("Render() = %q, want \"Hello|\"", got)
	}
}

func TestHistoryUndoesBackupsInReverseOrder(t *testing.T) {
	captureStdout(t, func() {
		e := &Editor{}
		h := &History{editor: e}
		e.Type("one")
		h.Backup()
		e.Type(" two")
		h.Backup()
		e.Type(" three")

		h.Undo()
		if e.content != "one two" {
			t.Fatalf("after first undo = %q, want \"one two\"", e.content)
		}
		h.Undo()
		if e.content != "one" {
			t.Errorf("after second undo = %q, want \"one\"", e.content)
		}
	})
}

func TestUndoWithAnEmptyHistoryLeavesTheEditorUntouched(t *testing.T) {
	e := editorWith("Hello")
	h := &History{editor: e}

	out := captureStdout(t, h.Undo)

	if got := e.Render(); got != "Hello|" {
		t.Errorf("Render() = %q, want \"Hello|\"", got)
	}
	if out != "[history] nothing to undo\n" {
		t.Errorf("output = %q", out)
	}
}

func TestHistoryReportsTheStackSize(t *testing.T) {
	h := &History{editor: editorWith("Hi")}

	out := captureStdout(t, func() {
		h.Backup()
		h.Backup()
		h.Undo()
	})

	want := "[history] backup saved (1 in stack)\n" +
		"[history] backup saved (2 in stack)\n" +
		"[history] restored latest backup (1 left)\n"
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
