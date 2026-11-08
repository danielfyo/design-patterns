/**
 * Memento pattern: save and restore an editor's state without exposing it.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (MementoDemo.tsx).
 */

interface EditorState {
  readonly content: string;
  readonly cursor: number;
}

// Module-private "keys" to the memento. They are assigned inside the class's
// static block (the only place that can touch the # fields) and never exported,
// so only code in this module (the Editor) can create or read snapshots.
let createSnapshot!: (state: EditorState) => EditorSnapshot;
let readSnapshot!: (snapshot: EditorSnapshot) => EditorState;

/**
 * Concrete Memento: immutable and opaque. Its state lives in ECMAScript private
 * fields (#), which are truly inaccessible from outside the class at runtime.
 */
export class EditorSnapshot {
  readonly #content: string;
  readonly #cursor: number;

  private constructor({ content, cursor }: EditorState) {
    this.#content = content;
    this.#cursor = cursor;
  }

  static {
    createSnapshot = (state) => new EditorSnapshot(state);
    readSnapshot = (snapshot) => ({ content: snapshot.#content, cursor: snapshot.#cursor });
  }
}

/**
 * The Originator: owns the state (text and cursor), creates snapshots of it
 * and restores itself from them.
 */
export class Editor {
  #content = "";
  #cursor = 0;

  get content(): string {
    return this.#content;
  }

  get cursor(): number {
    return this.#cursor;
  }

  type(text: string): void {
    this.#content = this.#content.slice(0, this.#cursor) + text + this.#content.slice(this.#cursor);
    this.#cursor += text.length;
  }

  moveCursor(position: number): void {
    this.#cursor = Math.min(Math.max(position, 0), this.#content.length);
  }

  backspace(count: number): void {
    const n = Math.min(count, this.#cursor);
    this.#content = this.#content.slice(0, this.#cursor - n) + this.#content.slice(this.#cursor);
    this.#cursor -= n;
  }

  /** The text with a "|" where the cursor is. */
  render(): string {
    return this.#content.slice(0, this.#cursor) + "|" + this.#content.slice(this.#cursor);
  }

  /** Creates a memento with a copy of the current state. */
  save(): EditorSnapshot {
    return createSnapshot({ content: this.#content, cursor: this.#cursor });
  }

  /** Restores the state captured in a memento. */
  restore(snapshot: EditorSnapshot): void {
    ({ content: this.#content, cursor: this.#cursor } = readSnapshot(snapshot));
  }
}

/**
 * The Caretaker: keeps a stack of snapshots and decides *when* to save and
 * restore, without ever looking inside them.
 */
export class History {
  readonly #snapshots: EditorSnapshot[] = [];

  constructor(
    private readonly editor: Editor,
    private readonly log: (line: string) => void = console.log,
  ) {}

  get size(): number {
    return this.#snapshots.length;
  }

  backup(): void {
    this.#snapshots.push(this.editor.save());
    this.log(`[history] backup saved (${this.#snapshots.length} in stack)`);
  }

  undo(): void {
    const snapshot = this.#snapshots.pop();
    if (!snapshot) {
      this.log("[history] nothing to undo");
      return;
    }
    this.editor.restore(snapshot);
    this.log(`[history] restored latest backup (${this.#snapshots.length} left)`);
  }
}
