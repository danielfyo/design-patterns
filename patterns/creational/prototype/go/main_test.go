package main

import (
	"bytes"
	"io"
	"os"
	"slices"
	"testing"
)

const reportText = "Quarterly Report | Times 12pt | sections=[Summary, Findings] | metadata={owner=analytics, status=template}"

func newReport() *Document {
	return &Document{
		Title:    "Quarterly Report",
		Sections: []string{"Summary", "Findings"},
		Metadata: map[string]string{"status": "template", "owner": "analytics"},
		Style:    &Style{Font: "Times", SizePt: 12},
	}
}

func TestCloneCopiesEveryValue(t *testing.T) {
	if got := newReport().Clone().String(); got != reportText {
		t.Errorf("Clone() = %s", got)
	}
}

func TestCloneIsDeepAndSharesNoMutableState(t *testing.T) {
	original := newReport()

	clone := original.Clone()

	if sameData(clone.Sections, original.Sections) || sameData(clone.Metadata, original.Metadata) || clone.Style == original.Style {
		t.Error("clone shares state with the original")
	}
	if *clone.Style != *original.Style {
		t.Errorf("style = %+v, want %+v", *clone.Style, *original.Style)
	}
}

func TestMutatingACloneLeavesTheOriginalIntact(t *testing.T) {
	original := newReport()
	clone := original.Clone()

	clone.Title = "Draft"
	clone.Sections[0] = "Cover page"
	clone.Sections = append(clone.Sections, "Appendix")
	clone.Metadata["status"] = "edited"
	clone.Style.Font = "Georgia"
	clone.Style.SizePt = 9

	if got := original.String(); got != reportText {
		t.Errorf("original = %s", got)
	}
	want := "Draft | Georgia 9pt | sections=[Cover page, Findings, Appendix] | metadata={owner=analytics, status=edited}"
	if got := clone.String(); got != want {
		t.Errorf("clone = %s", got)
	}
}

func TestShallowCopySharesReferencesSoEditsLeakIntoTheOriginal(t *testing.T) {
	original := newReport()
	shallow := original.ShallowCopy()

	shallow.Title = "Draft"
	shallow.Sections[0] = "Cover page"
	shallow.Metadata["status"] = "edited"
	shallow.Style.Font = "Comic Sans"

	if !sameData(shallow.Sections, original.Sections) || shallow.Style != original.Style {
		t.Error("shallow copy should share references")
	}
	if original.Title != "Quarterly Report" {
		t.Errorf("title leaked: %s", original.Title)
	}
	want := "Quarterly Report | Comic Sans 12pt | sections=[Cover page, Findings] | metadata={owner=analytics, status=edited}"
	if got := original.String(); got != want {
		t.Errorf("original = %s", got)
	}
}

func TestRegistryStoresAPrivateCloneOfTheRegisteredPrototype(t *testing.T) {
	registry := NewTemplateRegistry()
	source := newReport()
	registry.Register("report", source)

	source.Sections[0] = "Changed"
	source.Style.Font = "Comic Sans"

	doc, err := registry.Create("report")
	if err != nil {
		t.Fatal(err)
	}
	if got := doc.String(); got != reportText {
		t.Errorf("template = %s", got)
	}
}

func TestRegistryHandsOutIndependentClones(t *testing.T) {
	registry := NewTemplateRegistry()
	registry.Register("report", newReport())

	first, _ := registry.Create("report")
	first.Metadata["status"] = "draft"
	second, _ := registry.Create("report")

	if first == second || second.Metadata["status"] != "template" {
		t.Errorf("second = %s", second)
	}
}

func TestRegistryListsNamesInSortedOrder(t *testing.T) {
	registry := NewTemplateRegistry()
	for _, name := range []string{"report", "invoice", "Memo"} {
		registry.Register(name, newReport())
	}

	if got, want := registry.Names(), []string{"Memo", "invoice", "report"}; !slices.Equal(got, want) {
		t.Errorf("Names() = %q, want %q", got, want)
	}
}

func TestRegistryRejectsAnUnknownTemplate(t *testing.T) {
	doc, err := NewTemplateRegistry().Create("memo")

	if doc != nil || err == nil || err.Error() != `no template named "memo"` {
		t.Errorf("Create() = %v, %v", doc, err)
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
