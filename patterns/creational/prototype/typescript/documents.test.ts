import { describe, expect, it } from "vitest";
import { Document, Style, TemplateRegistry, defaultRegistry } from "./documents.ts";

const reportText =
  "Quarterly Report | Times 12pt | sections=[Summary, Findings] | metadata={owner=analytics, status=template}";

const newReport = () =>
  new Document(
    "Quarterly Report",
    ["Summary", "Findings"],
    new Map([
      ["status", "template"],
      ["owner", "analytics"],
    ]),
    new Style("Times", 12),
  );

describe("Prototype: document templates", () => {
  it("copies every value and keeps the class", () => {
    const clone = newReport().clone();

    expect(clone.toString()).toBe(reportText);
    expect(clone).toBeInstanceOf(Document);
    expect(clone.style).toBeInstanceOf(Style);
  });

  it("makes a deep clone that shares no mutable state", () => {
    const original = newReport();

    const clone = original.clone();

    expect(clone.sections).not.toBe(original.sections);
    expect(clone.metadata).not.toBe(original.metadata);
    expect(clone.style).not.toBe(original.style);
    expect(clone.style).toEqual(original.style);
  });

  it("leaves the original intact when the clone is mutated", () => {
    const original = newReport();
    const clone = original.clone();

    clone.title = "Draft";
    clone.sections[0] = "Cover page";
    clone.sections.push("Appendix");
    clone.metadata.set("status", "edited");
    clone.style.font = "Georgia";
    clone.style.sizePt = 9;

    expect(original.toString()).toBe(reportText);
    expect(clone.toString()).toBe(
      "Draft | Georgia 9pt | sections=[Cover page, Findings, Appendix] | metadata={owner=analytics, status=edited}",
    );
  });

  it("leaks edits into the original through a shallow copy", () => {
    const original = newReport();
    const shallow = original.shallowCopy();

    shallow.title = "Draft";
    shallow.sections[0] = "Cover page";
    shallow.metadata.set("status", "edited");
    shallow.style.font = "Comic Sans";

    expect(shallow.sections).toBe(original.sections);
    expect(shallow.style).toBe(original.style);
    expect(original.title).toBe("Quarterly Report");
    expect(original.toString()).toBe(
      "Quarterly Report | Comic Sans 12pt | sections=[Cover page, Findings] | metadata={owner=analytics, status=edited}",
    );
  });

  it("stores a private clone of the registered prototype", () => {
    const registry = new TemplateRegistry();
    const source = newReport();
    registry.register("report", source);

    source.sections.length = 0;
    source.style.font = "Comic Sans";

    expect(registry.create("report").toString()).toBe(reportText);
  });

  it("hands out independent clones from the registry", () => {
    const registry = new TemplateRegistry();
    registry.register("report", newReport());

    const first = registry.create("report");
    first.metadata.set("status", "draft");
    const second = registry.create("report");

    expect(first).not.toBe(second);
    expect(second.metadata.get("status")).toBe("template");
  });

  it("lists registered names in sorted order", () => {
    const registry = new TemplateRegistry();
    for (const name of ["report", "invoice", "Memo"]) registry.register(name, newReport());

    expect(registry.names).toEqual(["Memo", "invoice", "report"]);
    expect(defaultRegistry().names).toEqual(["invoice", "report"]);
  });

  it("rejects an unknown template", () => {
    expect(() => new TemplateRegistry().create("memo")).toThrow('no template named "memo"');
  });
});
