package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"reflect"
	"strings"
	"testing"
)

// recordingSteps implements the required step and every optional hook, recording the call order.
type recordingSteps struct {
	products []Product
	calls    []string
}

func (r *recordingSteps) Parse(string) ([]Product, error) {
	r.calls = append(r.calls, "parse")
	return r.products, nil
}

func (r *recordingSteps) Validate(records []Product) []Product {
	r.calls = append(r.calls, "validate")
	return DefaultValidate(records)
}

func (r *recordingSteps) Transform(p Product) Product {
	r.calls = append(r.calls, "transform "+p.SKU)
	return p
}

func (r *recordingSteps) OnComplete(ImportSummary) { r.calls = append(r.calls, "complete") }

// parseOnly implements only the required step, so every default is used.
type parseOnly struct{ products []Product }

func (p parseOnly) Parse(string) ([]Product, error) { return p.products, nil }

func TestTemplateCallsTheStepsInAFixedOrder(t *testing.T) {
	steps := &recordingSteps{products: []Product{{"a", "A", 1}, {"b", "B", 2}}}

	captureStdout(t, func() { _, _ = Import(steps, "ignored") })

	want := []string{"parse", "validate", "transform a", "transform b", "complete"}
	if !reflect.DeepEqual(steps.calls, want) {
		t.Errorf("calls = %v, want %v", steps.calls, want)
	}
}

func TestCsvImporterDropsInvalidRowsAndSummarisesTheRest(t *testing.T) {
	var summary ImportSummary
	var err error
	out := captureStdout(t, func() { summary, err = Import(CsvImporter{}, csvSample) })

	if err != nil {
		t.Fatal(err)
	}
	if want := (ImportSummary{Read: 4, Dropped: 2, Saved: 2, Total: 77.50}); summary != want {
		t.Errorf("summary = %+v, want %+v", summary, want)
	}
	for _, line := range []string{"[validate] dropped bk-002: empty name", "[validate] dropped bk-003: negative price -5.00"} {
		if !strings.Contains(out, line) {
			t.Errorf("output lacks %q", line)
		}
	}
}

func TestCsvImporterExtendsTheCompletionHookAfterTheDefault(t *testing.T) {
	out := captureStdout(t, func() { _, _ = Import(CsvImporter{}, csvSample) })

	lines := strings.Split(strings.TrimRight(out, "\n"), "\n")
	if !strings.HasPrefix(lines[len(lines)-2], "[complete] ") {
		t.Errorf("second to last line = %q", lines[len(lines)-2])
	}
	if got := lines[len(lines)-1]; got != "[notify] import report sent to the catalog team" {
		t.Errorf("last line = %q", got)
	}
}

func TestJsonImporterOverridesTheTransformHook(t *testing.T) {
	var summary ImportSummary
	out := captureStdout(t, func() { summary, _ = Import(JsonImporter{}, jsonSample) })

	if summary.Read != 3 || summary.Dropped != 1 || summary.Saved != 2 || fmt.Sprintf("%.2f", summary.Total) != "69.89" {
		t.Errorf("summary = %+v", summary)
	}
	if !strings.Contains(out, "[transform] el-100 -> EL-100") || !strings.Contains(out, "[save] EL-200 ") {
		t.Errorf("transform hook not applied:\n%s", out)
	}
	if strings.Contains(out, "[notify]") {
		t.Error("JsonImporter must use the default completion hook")
	}
}

func TestDefaultValidationTreatsAWhitespaceNameAsEmpty(t *testing.T) {
	var summary ImportSummary
	captureStdout(t, func() {
		summary, _ = Import(parseOnly{[]Product{{"x", "   ", 1}, {"y", "Y", 0}}}, "ignored")
	})

	if want := (ImportSummary{Read: 2, Dropped: 1, Saved: 1, Total: 0}); summary != want {
		t.Errorf("summary = %+v, want %+v", summary, want)
	}
}

func TestImportingNothingYieldsAnEmptySummary(t *testing.T) {
	var summary ImportSummary
	out := captureStdout(t, func() { summary, _ = Import(CsvImporter{}, "sku,name,price") })

	if summary != (ImportSummary{}) {
		t.Errorf("summary = %+v, want zero", summary)
	}
	if !strings.HasPrefix(out, "[parse] 0 record(s) read\n[complete] 0 read") {
		t.Errorf("output = %q", out)
	}
}

func TestParseErrorsStopTheTemplateBeforeAnyOtherStep(t *testing.T) {
	var err error
	out := captureStdout(t, func() { _, err = Import(CsvImporter{}, "sku,name,price\nbad-line") })

	if err == nil {
		t.Fatal("expected an error for a malformed CSV line")
	}
	if out != "" {
		t.Errorf("no step should run after a parse error, got %q", out)
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
