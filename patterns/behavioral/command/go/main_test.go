package main

import (
	"bytes"
	"io"
	"os"
	"testing"
)

func TestInsertAndUndoRestoreThePreviousContent(t *testing.T) {
	doc, history := &TextDocument{}, &CommandHistory{}
	history.Execute(&InsertTextCommand{Doc: doc, Position: 0, Text: "Hello"})
	history.Execute(&InsertTextCommand{Doc: doc, Position: 5, Text: " world"})
	if doc.Content != "Hello world" {
		t.Fatalf("Content = %q", doc.Content)
	}

	history.Undo()

	if doc.Content != "Hello" {
		t.Errorf("after undo Content = %q, want %q", doc.Content, "Hello")
	}
}

func TestDeleteRemembersTheRemovedTextSoUndoCanBringItBack(t *testing.T) {
	doc, history := &TextDocument{Content: "Hello, world"}, &CommandHistory{}

	history.Execute(&DeleteTextCommand{Doc: doc, Position: 5, Length: 7})
	if doc.Content != "Hello" {
		t.Fatalf("after delete Content = %q", doc.Content)
	}
	history.Undo()

	if doc.Content != "Hello, world" {
		t.Errorf("after undo Content = %q", doc.Content)
	}
}

func TestRedoReExecutesTheLastUndoneCommand(t *testing.T) {
	doc, history := &TextDocument{}, &CommandHistory{}
	cmd := &InsertTextCommand{Doc: doc, Position: 0, Text: "Hi"}
	history.Execute(cmd)
	history.Undo()

	redone := history.Redo()

	if redone != cmd {
		t.Errorf("Redo() returned %v, want the undone command", redone)
	}
	if doc.Content != "Hi" {
		t.Errorf("Content = %q, want Hi", doc.Content)
	}
	if history.UndoCount() != 1 || history.RedoCount() != 0 {
		t.Errorf("undo=%d redo=%d, want 1 and 0", history.UndoCount(), history.RedoCount())
	}
}

func TestExecutingANewCommandClearsTheRedoStack(t *testing.T) {
	doc, history := &TextDocument{}, &CommandHistory{}
	history.Execute(&InsertTextCommand{Doc: doc, Position: 0, Text: "Hello"})
	history.Execute(&InsertTextCommand{Doc: doc, Position: 5, Text: "!"})
	history.Undo()
	if history.RedoCount() != 1 {
		t.Fatalf("RedoCount = %d, want 1", history.RedoCount())
	}

	history.Execute(&InsertTextCommand{Doc: doc, Position: 5, Text: "?"})

	if history.RedoCount() != 0 {
		t.Errorf("RedoCount = %d, want 0", history.RedoCount())
	}
	if c := history.Redo(); c != nil {
		t.Errorf("Redo() = %v, want nil", c)
	}
	if doc.Content != "Hello?" {
		t.Errorf("Content = %q, want Hello?", doc.Content)
	}
}

func TestUndoAndRedoOnAnEmptyHistoryReturnNil(t *testing.T) {
	doc, history := &TextDocument{Content: "text"}, &CommandHistory{}

	if c := history.Undo(); c != nil {
		t.Errorf("Undo() = %v, want nil", c)
	}
	if c := history.Redo(); c != nil {
		t.Errorf("Redo() = %v, want nil", c)
	}
	if doc.Content != "text" {
		t.Errorf("Content = %q, want text", doc.Content)
	}
}

func TestReplaceAllUndoRestoresTheSnapshot(t *testing.T) {
	doc, history := &TextDocument{Content: "world, world"}, &CommandHistory{}

	history.Execute(&ReplaceAllCommand{Doc: doc, Find: "world", Replacement: "WORLD"})
	if doc.Content != "WORLD, WORLD" {
		t.Fatalf("after replace Content = %q", doc.Content)
	}
	history.Undo()

	if doc.Content != "world, world" {
		t.Errorf("after undo Content = %q", doc.Content)
	}
}

func TestMacroRunsItsStepsInOrderAndUndoesThemAsOneStep(t *testing.T) {
	doc, history := &TextDocument{Content: "Hello, world"}, &CommandHistory{}
	macro := &MacroCommand{Name: "Shout", Commands: []Command{
		&ReplaceAllCommand{Doc: doc, Find: "world", Replacement: "WORLD"},
		&InsertTextCommand{Doc: doc, Position: 12, Text: "!"},
	}}

	history.Execute(macro)
	if doc.Content != "Hello, WORLD!" || history.UndoCount() != 1 {
		t.Fatalf("after macro Content = %q, undo = %d", doc.Content, history.UndoCount())
	}
	history.Undo()

	if doc.Content != "Hello, world" || history.UndoCount() != 0 {
		t.Errorf("after undo Content = %q, undo = %d", doc.Content, history.UndoCount())
	}
}

func TestCommandsDescribeThemselves(t *testing.T) {
	doc := &TextDocument{}
	tests := []struct {
		cmd  Command
		want string
	}{
		{&InsertTextCommand{Doc: doc, Position: 3, Text: "Hi"}, `Insert "Hi" at 3`},
		{&DeleteTextCommand{Doc: doc, Position: 5, Length: 7}, "Delete 7 chars at 5"},
		{&ReplaceAllCommand{Doc: doc, Find: "a", Replacement: "b"}, `Replace "a" with "b"`},
		{&MacroCommand{Name: "M"}, `Macro "M" (0 steps)`},
	}
	for _, tt := range tests {
		if got := tt.cmd.Description(); got != tt.want {
			t.Errorf("Description() = %q, want %q", got, tt.want)
		}
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
