/**
 * Prototype pattern: document templates that are cloned (deeply) instead of
 * being built from scratch.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (PrototypeDemo.tsx).
 */

/** Nested, mutable part of a document; a shallow copy would share it. */
export class Style {
  constructor(
    public font: string,
    public sizePt: number,
  ) {}

  clone(): Style {
    return new Style(this.font, this.sizePt);
  }
}

/**
 * Prototype: a document that knows how to copy itself. clone() performs a DEEP
 * copy, so the clone and the original never share mutable state.
 */
export class Document {
  constructor(
    public title: string,
    public readonly sections: string[],
    public readonly metadata: Map<string, string>,
    public readonly style: Style,
  ) {}

  /**
   * Deep copy, written explicitly. structuredClone(this) would also copy the
   * array and Map deeply, but it returns plain objects: the class prototype
   * (and so clone(), toString(), ...) would be lost.
   */
  clone(): Document {
    return new Document(this.title, [...this.sections], new Map(this.metadata), this.style.clone());
  }

  /** Shallow copy, for comparison only: the new object points at the SAME array, Map and Style. */
  shallowCopy(): Document {
    return new Document(this.title, this.sections, this.metadata, this.style);
  }

  toString(): string {
    const meta = [...this.metadata]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    return `${this.title} | ${this.style.font} ${this.style.sizePt}pt | sections=[${this.sections.join(", ")}] | metadata={${meta}}`;
  }
}

/**
 * Prototype registry: stores named, pre-configured prototypes and hands out
 * clones, so callers never construct documents from scratch.
 */
export class TemplateRegistry {
  readonly #prototypes = new Map<string, Document>();

  get names(): string[] {
    return [...this.#prototypes.keys()].sort();
  }

  /** Stores a private clone, so later changes to the caller's object do not affect the template. */
  register(name: string, prototype: Document): void {
    this.#prototypes.set(name, prototype.clone());
  }

  create(name: string): Document {
    const prototype = this.#prototypes.get(name);
    if (!prototype) throw new Error(`no template named "${name}"`);
    return prototype.clone();
  }
}

/** The registry used by both demos. */
export function defaultRegistry(): TemplateRegistry {
  const registry = new TemplateRegistry();
  registry.register(
    "invoice",
    new Document(
      "Invoice",
      ["Header", "Line items", "Totals"],
      new Map([
        ["owner", "billing"],
        ["status", "template"],
      ]),
      new Style("Helvetica", 10),
    ),
  );
  registry.register(
    "report",
    new Document(
      "Quarterly Report",
      ["Summary", "Findings", "Next steps"],
      new Map([
        ["owner", "analytics"],
        ["status", "template"],
      ]),
      new Style("Times", 12),
    ),
  );
  return registry;
}
