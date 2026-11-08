import { describe, expect, it } from "vitest";
import { Directory, File, buildSampleProject, type FileSystemNode } from "./fileSystem.ts";

/** The sample tree plus direct handles to two of its subtrees. */
function buildProject() {
  const src = new Directory("src").add(
    new File("index.ts", 300),
    new File("app.ts", 2400),
    new Directory("components").add(new File("Header.tsx", 1500), new File("Footer.tsx", 900)),
  );
  const assets = new Directory("assets").add(new File("logo.png", 5120), new File("styles.css", 640));
  const project = new Directory("project").add(new File("README.md", 1200), new File("package.json", 800), src, assets);
  return { project, src, assets };
}

describe("Composite: file system", () => {
  it("treats a file as a leaf with its own size and a single file", () => {
    const file = new File("app.ts", 2400);

    expect(file.size()).toBe(2400);
    expect(file.countFiles()).toBe(1);
    expect(file.findByExtension(".ts")).toEqual(["app.ts"]);
    expect(file.findByExtension(".tsx")).toEqual([]);
  });

  it("aggregates the size of every nested file", () => {
    const { project, src, assets } = buildProject();

    expect(src.size()).toBe(5100);
    expect(assets.size()).toBe(5760);
    expect(project.size()).toBe(12860);
  });

  it("counts leaves only, not directories", () => {
    const { project, src } = buildProject();

    expect(src.countFiles()).toBe(4);
    expect(project.countFiles()).toBe(8);
  });

  it("gives an empty directory no size and no files", () => {
    const empty = new Directory("empty");

    expect(empty.size()).toBe(0);
    expect(empty.countFiles()).toBe(0);
    expect(empty.findByExtension(".ts")).toEqual([]);
  });

  it("searches the whole tree in order and matches the suffix exactly", () => {
    const { project } = buildProject();

    expect(project.findByExtension(".ts")).toEqual(["index.ts", "app.ts"]);
    expect(project.findByExtension(".tsx")).toEqual(["Header.tsx", "Footer.tsx"]);
  });

  it("lets clients treat a leaf and a composite uniformly", () => {
    const nodes: FileSystemNode[] = [
      new File("app.ts", 2400),
      new Directory("lib").add(new File("a.ts", 10), new File("b.ts", 20)),
    ];

    expect(nodes.map((node) => node.size())).toEqual([2400, 30]);
    expect(nodes.map((node) => node.countFiles())).toEqual([1, 2]);
  });

  it("adds children fluently, in insertion order", () => {
    const a = new File("a", 1);
    const b = new File("b", 2);
    const dir = new Directory("dir");

    expect(dir.add(a).add(b)).toBe(dir);
    expect(dir.children).toEqual([a, b]);
  });

  it("updates every aggregate when a subtree is removed", () => {
    const { project, assets } = buildProject();

    expect(project.remove(assets)).toBe(true);

    expect(project.size()).toBe(7100);
    expect(project.countFiles()).toBe(6);
    expect(project.children).not.toContain(assets);
  });

  it("only removes direct children", () => {
    const { project, src } = buildProject();

    expect(project.remove(src.children[0])).toBe(false);
    expect(project.size()).toBe(12860);
  });

  it("prints each level indented with aggregated sizes", () => {
    const src = new Directory("src").add(new File("index.ts", 300), new Directory("lib").add(new File("a.ts", 10)));

    expect(src.print()).toEqual(["src/ (310 bytes)", "  index.ts (300 bytes)", "  lib/ (10 bytes)", "    a.ts (10 bytes)"]);
  });

  it("builds the same sample project as the console demo", () => {
    const sample = buildSampleProject();

    expect(sample.print()).toEqual(buildProject().project.print());
  });
});
