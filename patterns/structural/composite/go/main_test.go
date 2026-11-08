package main

import (
	"bytes"
	"io"
	"os"
	"slices"
	"testing"
)

// buildProject returns the sample tree used by the demo plus two of its subtrees.
func buildProject() (project, src, assets *Directory) {
	src = NewDirectory("src",
		NewFile("index.ts", 300),
		NewFile("app.ts", 2400),
		NewDirectory("components", NewFile("Header.tsx", 1500), NewFile("Footer.tsx", 900)),
	)
	assets = NewDirectory("assets", NewFile("logo.png", 5120), NewFile("styles.css", 640))
	project = NewDirectory("project", NewFile("README.md", 1200), NewFile("package.json", 800), src, assets)
	return project, src, assets
}

func TestFileIsALeafWithItsOwnSizeAndASingleFile(t *testing.T) {
	file := NewFile("app.ts", 2400)

	if file.Size() != 2400 || file.CountFiles() != 1 {
		t.Errorf("Size() = %d, CountFiles() = %d; want 2400, 1", file.Size(), file.CountFiles())
	}
	if got := file.FindByExtension(".ts"); !slices.Equal(got, []string{"app.ts"}) {
		t.Errorf(`FindByExtension(".ts") = %q`, got)
	}
	if got := file.FindByExtension(".tsx"); len(got) != 0 {
		t.Errorf(`FindByExtension(".tsx") = %q, want none`, got)
	}
}

func TestDirectorySizeAggregatesEveryNestedFile(t *testing.T) {
	project, src, assets := buildProject()

	tests := []struct {
		node FileSystemNode
		want int64
	}{
		{src, 5100},
		{assets, 5760},
		{project, 12860},
	}
	for _, tt := range tests {
		t.Run(tt.node.Name(), func(t *testing.T) {
			if got := tt.node.Size(); got != tt.want {
				t.Errorf("Size() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestCountFilesCountsLeavesOnlyNotDirectories(t *testing.T) {
	project, src, _ := buildProject()

	if got := src.CountFiles(); got != 4 {
		t.Errorf("src.CountFiles() = %d, want 4", got)
	}
	if got := project.CountFiles(); got != 8 {
		t.Errorf("project.CountFiles() = %d, want 8", got)
	}
}

func TestEmptyDirectoryHasNoSizeAndNoFiles(t *testing.T) {
	empty := NewDirectory("empty")

	if empty.Size() != 0 || empty.CountFiles() != 0 || len(empty.FindByExtension(".ts")) != 0 {
		t.Errorf("empty directory: size %d, files %d", empty.Size(), empty.CountFiles())
	}
}

func TestFindByExtensionSearchesTheWholeTreeInOrderAndMatchesTheSuffixExactly(t *testing.T) {
	project, _, _ := buildProject()

	if got := project.FindByExtension(".ts"); !slices.Equal(got, []string{"index.ts", "app.ts"}) {
		t.Errorf(`FindByExtension(".ts") = %q`, got)
	}
	if got := project.FindByExtension(".tsx"); !slices.Equal(got, []string{"Header.tsx", "Footer.tsx"}) {
		t.Errorf(`FindByExtension(".tsx") = %q`, got)
	}
}

func TestClientsTreatALeafAndACompositeUniformly(t *testing.T) {
	nodes := []FileSystemNode{
		NewFile("app.ts", 2400),
		NewDirectory("lib", NewFile("a.ts", 10), NewFile("b.ts", 20)),
	}
	wantSizes, wantFiles := []int64{2400, 30}, []int{1, 2}

	for i, node := range nodes {
		if node.Size() != wantSizes[i] || node.CountFiles() != wantFiles[i] {
			t.Errorf("%s: size %d, files %d; want %d, %d",
				node.Name(), node.Size(), node.CountFiles(), wantSizes[i], wantFiles[i])
		}
	}
}

func TestAddAppendsChildrenInInsertionOrder(t *testing.T) {
	a, b := NewFile("a", 1), NewFile("b", 2)
	dir := NewDirectory("dir")

	dir.Add(a)
	dir.Add(b)

	if !slices.Equal(dir.children, []FileSystemNode{a, b}) {
		t.Errorf("children = %v, want [a b]", dir.children)
	}
}

func TestRemovingASubtreeUpdatesEveryAggregate(t *testing.T) {
	project, _, assets := buildProject()

	project.Remove(assets)

	if project.Size() != 7100 || project.CountFiles() != 6 {
		t.Errorf("after remove: size %d, files %d; want 7100, 6", project.Size(), project.CountFiles())
	}
	if slices.Contains(project.children, FileSystemNode(assets)) {
		t.Error("assets is still a child of project")
	}
}

func TestRemoveOnlyAffectsDirectChildren(t *testing.T) {
	project, src, _ := buildProject()

	project.Remove(src.children[0])

	if got := project.Size(); got != 12860 {
		t.Errorf("Size() = %d, want 12860 (nested node must not be removed)", got)
	}
}

func TestPrintIndentsEachLevelAndShowsAggregatedSizes(t *testing.T) {
	dir := NewDirectory("src", NewFile("index.ts", 300), NewDirectory("lib", NewFile("a.ts", 10)))

	got := captureStdout(t, func() { dir.Print(0) })

	want := "src/ (310 bytes)\n  index.ts (300 bytes)\n  lib/ (10 bytes)\n    a.ts (10 bytes)\n"
	if got != want {
		t.Errorf("Print() =\n%s\nwant\n%s", got, want)
	}
}

func TestDemoPrintsTheExpectedOutput(t *testing.T) {
	want, err := os.ReadFile("../expected_output.txt")
	if err != nil {
		t.Fatal(err)
	}
	if got := captureStdout(t, main); got != string(want) {
		t.Errorf("output mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

// captureStdout runs fn and returns everything it printed to os.Stdout.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	original := os.Stdout
	os.Stdout = w
	defer func() { os.Stdout = original }()

	fn()
	_ = w.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}
