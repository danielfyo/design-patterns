/**
 * Command pattern: a text editor with undo/redo.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (CommandDemo.tsx).
 */

/**
 * Receiver: the object that knows how to do the real work. It has no idea
 * that commands, undo or redo exist.
 */
export class TextDocument {
  content = "";

  insert(position: number, text: string): void {
    this.content = this.content.slice(0, position) + text + this.content.slice(position);
  }

  /** Removes `length` characters and returns them. */
  delete(position: number, length: number): string {
    const removed = this.content.slice(position, position + length);
    this.content = this.content.slice(0, position) + this.content.slice(position + length);
    return removed;
  }

  replace(content: string): void {
    this.content = content;
  }
}

/**
 * Command: every editor operation is an object with the same interface,
 * so the invoker can execute, store, undo and redo it without knowing what it does.
 */
export interface Command {
  readonly description: string;
  execute(): void;
  undo(): void;
}

/** Concrete Command: inserts text; undo removes the same characters. */
export class InsertTextCommand implements Command {
  constructor(
    private readonly document: TextDocument,
    private readonly position: number,
    private readonly text: string,
  ) {}

  get description(): string {
    return `Insert "${this.text}" at ${this.position}`;
  }
  execute(): void {
    this.document.insert(this.position, this.text);
  }
  undo(): void {
    this.document.delete(this.position, this.text.length);
  }
}

/**
 * Concrete Command: deletes text. It remembers what it deleted, because the
 * receiver cannot bring it back on its own.
 */
export class DeleteTextCommand implements Command {
  private deleted = "";

  constructor(
    private readonly document: TextDocument,
    private readonly position: number,
    private readonly length: number,
  ) {}

  get description(): string {
    return `Delete ${this.length} chars at ${this.position}`;
  }
  execute(): void {
    this.deleted = this.document.delete(this.position, this.length);
  }
  undo(): void {
    this.document.insert(this.position, this.deleted);
  }
}

/**
 * Concrete Command: replaces every occurrence of a word. Undo restores a
 * snapshot of the previous content (simpler than inverting each replacement).
 */
export class ReplaceAllCommand implements Command {
  private before = "";

  constructor(
    private readonly document: TextDocument,
    private readonly find: string,
    private readonly replacement: string,
  ) {}

  get description(): string {
    return `Replace "${this.find}" with "${this.replacement}"`;
  }
  execute(): void {
    this.before = this.document.content;
    this.document.replace(this.before.replaceAll(this.find, this.replacement));
  }
  undo(): void {
    this.document.replace(this.before);
  }
}

/**
 * Macro Command (a Composite of commands): executes its children in order and
 * undoes them in reverse order, so the whole macro is a single undo step.
 */
export class MacroCommand implements Command {
  constructor(
    private readonly name: string,
    private readonly commands: readonly Command[],
  ) {}

  get description(): string {
    return `Macro "${this.name}" (${this.commands.length} steps)`;
  }
  execute(): void {
    for (const command of this.commands) command.execute();
  }
  undo(): void {
    for (const command of [...this.commands].reverse()) command.undo();
  }
}

/**
 * Invoker: executes commands and keeps the undo/redo history. Executing a new
 * command clears the redo stack (the "future" is no longer valid).
 */
export class CommandHistory {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];

  get undoCount(): number {
    return this.undoStack.length;
  }
  get redoCount(): number {
    return this.redoStack.length;
  }

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
  }

  /** Undoes the last command and returns it, or null if there is nothing to undo. */
  undo(): Command | null {
    const command = this.undoStack.pop();
    if (command === undefined) return null;
    command.undo();
    this.redoStack.push(command);
    return command;
  }

  /** Re-executes the last undone command and returns it, or null if there is nothing to redo. */
  redo(): Command | null {
    const command = this.redoStack.pop();
    if (command === undefined) return null;
    command.execute();
    this.undoStack.push(command);
    return command;
  }
}
