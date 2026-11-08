// Command pattern: a text editor with undo/redo.
//
// Run with: go run ./patterns/behavioral/command/go
package main

import (
	"fmt"
	"strings"
)

// TextDocument is the Receiver: it knows how to do the real work and has no
// idea that commands, undo or redo exist.
type TextDocument struct {
	Content string
}

func (d *TextDocument) Insert(position int, text string) {
	d.Content = d.Content[:position] + text + d.Content[position:]
}

// Delete removes length bytes and returns them.
func (d *TextDocument) Delete(position, length int) string {
	removed := d.Content[position : position+length]
	d.Content = d.Content[:position] + d.Content[position+length:]
	return removed
}

func (d *TextDocument) Replace(content string) { d.Content = content }

// Command is the Command interface: every editor operation exposes the same
// methods, so the invoker can execute, store, undo and redo it.
type Command interface {
	Description() string
	Execute()
	Undo()
}

// InsertTextCommand is a concrete command: inserts text; undo removes it.
type InsertTextCommand struct {
	Doc      *TextDocument
	Position int
	Text     string
}

func (c *InsertTextCommand) Description() string {
	return fmt.Sprintf("Insert \"%s\" at %d", c.Text, c.Position)
}
func (c *InsertTextCommand) Execute() { c.Doc.Insert(c.Position, c.Text) }
func (c *InsertTextCommand) Undo()    { c.Doc.Delete(c.Position, len(c.Text)) }

// DeleteTextCommand is a concrete command: it deletes text and remembers it,
// because the receiver cannot bring it back on its own.
type DeleteTextCommand struct {
	Doc      *TextDocument
	Position int
	Length   int
	deleted  string
}

func (c *DeleteTextCommand) Description() string {
	return fmt.Sprintf("Delete %d chars at %d", c.Length, c.Position)
}
func (c *DeleteTextCommand) Execute() { c.deleted = c.Doc.Delete(c.Position, c.Length) }
func (c *DeleteTextCommand) Undo()    { c.Doc.Insert(c.Position, c.deleted) }

// ReplaceAllCommand is a concrete command: replaces every occurrence of a
// word. Undo restores a snapshot of the previous content.
type ReplaceAllCommand struct {
	Doc         *TextDocument
	Find        string
	Replacement string
	before      string
}

func (c *ReplaceAllCommand) Description() string {
	return fmt.Sprintf("Replace \"%s\" with \"%s\"", c.Find, c.Replacement)
}
func (c *ReplaceAllCommand) Execute() {
	c.before = c.Doc.Content
	c.Doc.Replace(strings.ReplaceAll(c.before, c.Find, c.Replacement))
}
func (c *ReplaceAllCommand) Undo() { c.Doc.Replace(c.before) }

// MacroCommand is a composite command: it executes its children in order and
// undoes them in reverse order, so the whole macro is a single undo step.
type MacroCommand struct {
	Name     string
	Commands []Command
}

func (m *MacroCommand) Description() string {
	return fmt.Sprintf("Macro \"%s\" (%d steps)", m.Name, len(m.Commands))
}
func (m *MacroCommand) Execute() {
	for _, c := range m.Commands {
		c.Execute()
	}
}
func (m *MacroCommand) Undo() {
	for i := len(m.Commands) - 1; i >= 0; i-- {
		m.Commands[i].Undo()
	}
}

// CommandHistory is the Invoker: it executes commands and keeps the undo/redo
// stacks. Executing a new command clears the redo stack.
type CommandHistory struct {
	undo []Command
	redo []Command
}

func (h *CommandHistory) UndoCount() int { return len(h.undo) }
func (h *CommandHistory) RedoCount() int { return len(h.redo) }

func (h *CommandHistory) Execute(c Command) {
	c.Execute()
	h.undo = append(h.undo, c)
	h.redo = nil
}

// Undo undoes the last command and returns it, or nil if there is nothing to undo.
func (h *CommandHistory) Undo() Command {
	if len(h.undo) == 0 {
		return nil
	}
	c := h.undo[len(h.undo)-1]
	h.undo = h.undo[:len(h.undo)-1]
	c.Undo()
	h.redo = append(h.redo, c)
	return c
}

// Redo re-executes the last undone command and returns it, or nil if there is nothing to redo.
func (h *CommandHistory) Redo() Command {
	if len(h.redo) == 0 {
		return nil
	}
	c := h.redo[len(h.redo)-1]
	h.redo = h.redo[:len(h.redo)-1]
	c.Execute()
	h.undo = append(h.undo, c)
	return c
}

func main() {
	fmt.Println("=== Command Pattern: Text editor with undo/redo ===")

	doc := &TextDocument{}
	history := &CommandHistory{}

	show := func(action, description string) {
		fmt.Printf("%-8s%-30s -> \"%s\"\n", action, description, doc.Content)
	}
	execute := func(c Command) {
		history.Execute(c)
		show("execute", c.Description())
	}
	undo := func() {
		if c := history.Undo(); c != nil {
			show("undo", c.Description())
		} else {
			show("undo", "(nothing to undo)")
		}
	}
	redo := func() {
		if c := history.Redo(); c != nil {
			show("redo", c.Description())
		} else {
			show("redo", "(nothing to redo)")
		}
	}

	execute(&InsertTextCommand{Doc: doc, Position: 0, Text: "Hello"})
	execute(&InsertTextCommand{Doc: doc, Position: 5, Text: " world"})
	execute(&InsertTextCommand{Doc: doc, Position: 5, Text: ","})
	undo()
	redo()
	execute(&DeleteTextCommand{Doc: doc, Position: 5, Length: 7})
	undo()
	// A new command after an undo clears the redo stack.
	execute(&InsertTextCommand{Doc: doc, Position: 6, Text: " big"})
	redo()
	// A macro groups several commands into a single undoable step.
	execute(&MacroCommand{Name: "Shout", Commands: []Command{
		&ReplaceAllCommand{Doc: doc, Find: "world", Replacement: "WORLD"},
		&InsertTextCommand{Doc: doc, Position: 16, Text: "!"},
	}})
	undo()
	undo()
	fmt.Printf("History: undo=%d, redo=%d\n", history.UndoCount(), history.RedoCount())
}
