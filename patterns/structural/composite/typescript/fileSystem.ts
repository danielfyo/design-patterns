/**
 * Composite pattern: files and directories treated uniformly as a tree.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (CompositeDemo.tsx).
 */

/**
 * Component: the common interface for files and directories. Clients call these
 * operations without knowing whether they talk to a single file or a whole tree.
 */
export abstract class FileSystemNode {
  constructor(readonly name: string) {}

  abstract size(): number;
  abstract countFiles(): number;
  abstract findByExtension(extension: string): string[];
  /** Returns the printed lines so both the console and React can use them. */
  abstract print(indent?: number): string[];

  protected static pad(indent: number): string {
    return "  ".repeat(indent);
  }
}

/** Leaf: a file has a size of its own and no children. */
export class File extends FileSystemNode {
  constructor(
    name: string,
    private readonly sizeInBytes: number,
  ) {
    super(name);
  }

  override size(): number {
    return this.sizeInBytes;
  }

  override countFiles(): number {
    return 1;
  }

  override findByExtension(extension: string): string[] {
    return this.name.endsWith(extension) ? [this.name] : [];
  }

  override print(indent = 0): string[] {
    return [`${FileSystemNode.pad(indent)}${this.name} (${this.size()} bytes)`];
  }
}

/**
 * Composite: a directory stores child nodes (files or other directories) and implements
 * every operation by delegating to its children and combining the results.
 */
export class Directory extends FileSystemNode {
  readonly #children: FileSystemNode[] = [];

  get children(): readonly FileSystemNode[] {
    return this.#children;
  }

  /** Returns `this` so trees can be built fluently. */
  add(...nodes: FileSystemNode[]): this {
    this.#children.push(...nodes);
    return this;
  }

  remove(node: FileSystemNode): boolean {
    const index = this.#children.indexOf(node);
    if (index === -1) return false;
    this.#children.splice(index, 1);
    return true;
  }

  override size(): number {
    return this.#children.reduce((sum, child) => sum + child.size(), 0);
  }

  override countFiles(): number {
    return this.#children.reduce((sum, child) => sum + child.countFiles(), 0);
  }

  override findByExtension(extension: string): string[] {
    return this.#children.flatMap((child) => child.findByExtension(extension));
  }

  override print(indent = 0): string[] {
    return [
      `${FileSystemNode.pad(indent)}${this.name}/ (${this.size()} bytes)`,
      ...this.#children.flatMap((child) => child.print(indent + 1)),
    ];
  }
}

/** Builds the sample project tree used by both demos. */
export function buildSampleProject(): Directory {
  return new Directory("project").add(
    new File("README.md", 1200),
    new File("package.json", 800),
    new Directory("src").add(
      new File("index.ts", 300),
      new File("app.ts", 2400),
      new Directory("components").add(new File("Header.tsx", 1500), new File("Footer.tsx", 900)),
    ),
    new Directory("assets").add(new File("logo.png", 5120), new File("styles.css", 640)),
  );
}
