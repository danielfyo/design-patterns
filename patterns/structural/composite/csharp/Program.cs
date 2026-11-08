using DesignPatterns.Composite;
// Avoid clashing with System.IO.File / System.IO.Directory from the implicit usings.
using Directory = DesignPatterns.Composite.Directory;
using File = DesignPatterns.Composite.File;

Console.WriteLine("=== Composite Pattern: File system ===");

var appTs = new File("app.ts", 2400);
var src = new Directory("src").Add(
    new File("index.ts", 300),
    appTs,
    new Directory("components").Add(new File("Header.tsx", 1500), new File("Footer.tsx", 900)));
var assets = new Directory("assets").Add(new File("logo.png", 5120), new File("styles.css", 640));
var project = new Directory("project").Add(new File("README.md", 1200), new File("package.json", 800), src, assets);

// One call prints the whole tree: each directory delegates to its children.
project.Print();
Console.WriteLine($"Total size: {project.Size()} bytes");
Console.WriteLine($"Files: {project.CountFiles()}");
foreach (var extension in new[] { ".ts", ".tsx" })
{
    Console.WriteLine($"Find *{extension}: {string.Join(", ", project.FindByExtension(extension))}");
}

// The client treats a single file and a whole folder uniformly.
Console.WriteLine("The same calls work on a leaf and on a folder:");
foreach (var node in new FileSystemNode[] { appTs, src })
{
    Console.WriteLine($"  {node.Name,-16} -> {node.Size()} bytes, {node.CountFiles()} file(s)");
}

Console.WriteLine("Removing assets/ from project/...");
project.Remove(assets);
project.Print();
Console.WriteLine($"Total size: {project.Size()} bytes, files: {project.CountFiles()}");
