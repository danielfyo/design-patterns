// Composite pattern: files and directories treated uniformly as a tree.
//
// Run with: go run ./patterns/structural/composite/go
package main

import (
	"fmt"
	"slices"
	"strings"
)

// FileSystemNode is the Component: the common interface for files and directories.
// Clients call these methods without knowing whether they talk to a single file
// or a whole tree.
type FileSystemNode interface {
	Name() string
	Size() int64
	CountFiles() int
	FindByExtension(ext string) []string
	Print(indent int)
}

func pad(indent int) string { return strings.Repeat("  ", indent) }

// File is the Leaf: it has a size of its own and no children.
type File struct {
	name        string
	sizeInBytes int64
}

func NewFile(name string, size int64) *File { return &File{name: name, sizeInBytes: size} }

func (f *File) Name() string    { return f.name }
func (f *File) Size() int64     { return f.sizeInBytes }
func (f *File) CountFiles() int { return 1 }
func (f *File) FindByExtension(ext string) []string {
	if strings.HasSuffix(f.name, ext) {
		return []string{f.name}
	}
	return nil
}
func (f *File) Print(indent int) {
	fmt.Printf("%s%s (%d bytes)\n", pad(indent), f.name, f.Size())
}

// Directory is the Composite: it stores child nodes (files or other directories)
// and implements every method by delegating to its children.
type Directory struct {
	name     string
	children []FileSystemNode
}

func NewDirectory(name string, children ...FileSystemNode) *Directory {
	return &Directory{name: name, children: children}
}

func (d *Directory) Add(nodes ...FileSystemNode) { d.children = append(d.children, nodes...) }

// Remove deletes a direct child. Interface values holding pointers compare by identity.
func (d *Directory) Remove(node FileSystemNode) {
	d.children = slices.DeleteFunc(d.children, func(c FileSystemNode) bool { return c == node })
}

func (d *Directory) Name() string { return d.name }

func (d *Directory) Size() int64 {
	var total int64
	for _, c := range d.children {
		total += c.Size()
	}
	return total
}

func (d *Directory) CountFiles() int {
	total := 0
	for _, c := range d.children {
		total += c.CountFiles()
	}
	return total
}

func (d *Directory) FindByExtension(ext string) []string {
	var found []string
	for _, c := range d.children {
		found = append(found, c.FindByExtension(ext)...)
	}
	return found
}

func (d *Directory) Print(indent int) {
	fmt.Printf("%s%s/ (%d bytes)\n", pad(indent), d.name, d.Size())
	for _, c := range d.children {
		c.Print(indent + 1)
	}
}

func main() {
	fmt.Println("=== Composite Pattern: File system ===")

	appTs := NewFile("app.ts", 2400)
	src := NewDirectory("src",
		NewFile("index.ts", 300),
		appTs,
		NewDirectory("components", NewFile("Header.tsx", 1500), NewFile("Footer.tsx", 900)),
	)
	assets := NewDirectory("assets", NewFile("logo.png", 5120), NewFile("styles.css", 640))
	project := NewDirectory("project", NewFile("README.md", 1200), NewFile("package.json", 800))
	project.Add(src, assets)

	// One call prints the whole tree: each directory delegates to its children.
	project.Print(0)
	fmt.Printf("Total size: %d bytes\n", project.Size())
	fmt.Printf("Files: %d\n", project.CountFiles())
	for _, ext := range []string{".ts", ".tsx"} {
		fmt.Printf("Find *%s: %s\n", ext, strings.Join(project.FindByExtension(ext), ", "))
	}

	// The client treats a single file and a whole folder uniformly.
	fmt.Println("The same calls work on a leaf and on a folder:")
	for _, node := range []FileSystemNode{appTs, src} {
		fmt.Printf("  %-16s -> %d bytes, %d file(s)\n", node.Name(), node.Size(), node.CountFiles())
	}

	fmt.Println("Removing assets/ from project/...")
	project.Remove(assets)
	project.Print(0)
	fmt.Printf("Total size: %d bytes, files: %d\n", project.Size(), project.CountFiles())
}
