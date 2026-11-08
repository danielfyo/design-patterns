// Memento pattern: save and restore an editor's state without exposing it.
//
// Run with: go run ./patterns/behavioral/memento/go
package main

import "fmt"

// EditorSnapshot is the Memento. Its fields are unexported, so code outside the
// package that defines it cannot read or modify them: other packages can only
// hold and pass around a *EditorSnapshot. (In this single-file demo everything
// lives in package main; in a real project Editor and EditorSnapshot would sit
// in their own package, e.g. "editor".) Nothing mutates it after creation.
type EditorSnapshot struct {
	content string
	cursor  int
}

// Editor is the Originator: it owns the state (text and cursor), creates
// snapshots of it and restores itself from them.
type Editor struct {
	content string
	cursor  int
}

// Cursor returns the cursor position.
func (e *Editor) Cursor() int { return e.cursor }

// Type inserts text at the cursor.
func (e *Editor) Type(text string) {
	e.content = e.content[:e.cursor] + text + e.content[e.cursor:]
	e.cursor += len(text)
}

// MoveCursor moves the cursor, clamped to the text bounds.
func (e *Editor) MoveCursor(position int) {
	e.cursor = min(max(position, 0), len(e.content))
}

// Backspace deletes up to count characters before the cursor.
func (e *Editor) Backspace(count int) {
	n := min(count, e.cursor)
	e.content = e.content[:e.cursor-n] + e.content[e.cursor:]
	e.cursor -= n
}

// Render returns the text with a "|" where the cursor is.
func (e *Editor) Render() string { return e.content[:e.cursor] + "|" + e.content[e.cursor:] }

// Save creates a memento with a copy of the current state.
func (e *Editor) Save() *EditorSnapshot {
	return &EditorSnapshot{content: e.content, cursor: e.cursor}
}

// Restore restores the state captured in a memento.
func (e *Editor) Restore(s *EditorSnapshot) {
	e.content, e.cursor = s.content, s.cursor
}

// History is the Caretaker: it keeps a stack of snapshots and decides when to
// save and restore, without ever looking inside them.
type History struct {
	editor    *Editor
	snapshots []*EditorSnapshot
}

// Backup pushes a snapshot of the editor onto the stack.
func (h *History) Backup() {
	h.snapshots = append(h.snapshots, h.editor.Save())
	fmt.Printf("[history] backup saved (%d in stack)\n", len(h.snapshots))
}

// Undo pops the latest snapshot and restores the editor from it.
func (h *History) Undo() {
	if len(h.snapshots) == 0 {
		fmt.Println("[history] nothing to undo")
		return
	}
	last := h.snapshots[len(h.snapshots)-1]
	h.snapshots = h.snapshots[:len(h.snapshots)-1]
	h.editor.Restore(last)
	fmt.Printf("[history] restored latest backup (%d left)\n", len(h.snapshots))
}

func main() {
	fmt.Println("=== Memento Pattern: Editor snapshots ===")

	editor := &Editor{}
	history := &History{editor: editor}

	show := func(action string) {
		fmt.Printf("%-20s \"%s\" (cursor %d)\n", action, editor.Render(), editor.Cursor())
	}
	typeText := func(text string) {
		editor.Type(text)
		show(fmt.Sprintf("type %q", text))
	}
	undo := func() {
		history.Undo()
		show("undo")
	}

	typeText("Hello")
	history.Backup()
	typeText(" world")
	history.Backup()

	editor.MoveCursor(5)
	show("move cursor to 5")
	typeText(" cruel")
	undo() // back to "Hello world|", cursor included

	typeText("!")
	history.Backup()
	editor.Backspace(7)
	show("backspace 7")

	undo()
	undo()
	undo() // the stack is empty: nothing happens
}
