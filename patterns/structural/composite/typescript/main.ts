// Run with: npx tsx patterns/structural/composite/typescript/main.ts
import { Directory, File, type FileSystemNode } from "./fileSystem.ts";

console.log("=== Composite Pattern: File system ===");

const appTs = new File("app.ts", 2400);
const src = new Directory("src").add(
  new File("index.ts", 300),
  appTs,
  new Directory("components").add(new File("Header.tsx", 1500), new File("Footer.tsx", 900)),
);
const assets = new Directory("assets").add(new File("logo.png", 5120), new File("styles.css", 640));
const project = new Directory("project").add(new File("README.md", 1200), new File("package.json", 800), src, assets);

// One call prints the whole tree: each directory delegates to its children.
project.print().forEach((line) => console.log(line));
console.log(`Total size: ${project.size()} bytes`);
console.log(`Files: ${project.countFiles()}`);
for (const extension of [".ts", ".tsx"]) {
  console.log(`Find *${extension}: ${project.findByExtension(extension).join(", ")}`);
}

// The client treats a single file and a whole folder uniformly.
console.log("The same calls work on a leaf and on a folder:");
const nodes: FileSystemNode[] = [appTs, src];
for (const node of nodes) {
  console.log(`  ${node.name.padEnd(16)} -> ${node.size()} bytes, ${node.countFiles()} file(s)`);
}

console.log("Removing assets/ from project/...");
project.remove(assets);
project.print().forEach((line) => console.log(line));
console.log(`Total size: ${project.size()} bytes, files: ${project.countFiles()}`);
