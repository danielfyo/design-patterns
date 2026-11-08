package main

import (
	"bytes"
	"io"
	"os"
	"testing"
)

const testURL = "https://api.example.com/users"

func TestBuildAppliesSensibleDefaultsToUnsetParts(t *testing.T) {
	req, err := NewHTTPRequestBuilder().URL(testURL).Build()
	if err != nil {
		t.Fatal(err)
	}

	if req.Method() != "GET" || req.URL() != testURL {
		t.Errorf("method/url = %s %s", req.Method(), req.URL())
	}
	if len(req.Headers()) != 0 || len(req.query) != 0 || req.body != nil || req.timeoutSeconds != 30 {
		t.Errorf("unexpected defaults: %+v", req)
	}
}

func TestFluentStepsCollectEveryPartAndRenderKeysInSortedOrder(t *testing.T) {
	req, err := NewHTTPRequestBuilder().
		Method("put").
		URL(testURL).
		Header("x-trace", "1").
		Header("Accept", "text/plain").
		Header("Accept", "application/json").
		Query("sort", "name").
		Query("page", "2").
		Body("{}").
		Timeout(5).
		Build()
	if err != nil {
		t.Fatal(err)
	}

	want := "PUT https://api.example.com/users?page=2&sort=name\n" +
		"  Accept: application/json\n" +
		"  x-trace: 1\n" +
		"  timeout: 5s\n" +
		"  body: {}"
	if got := req.String(); got != want {
		t.Errorf("String() =\n%s\nwant\n%s", got, want)
	}
}

func TestBuildValidatesTheCombinationOfParts(t *testing.T) {
	tests := []struct {
		name    string
		builder *HTTPRequestBuilder
		want    string
	}{
		{"no url", NewHTTPRequestBuilder().Method("GET"), "url is required"},
		{"GET with body", NewHTTPRequestBuilder().URL(testURL).Body("{}"), "GET requests cannot have a body"},
		{"HEAD with body", NewHTTPRequestBuilder().Method("head").URL(testURL).Body("{}"), "HEAD requests cannot have a body"},
		{"timeout 0", NewHTTPRequestBuilder().URL(testURL).Timeout(0), "timeout must be positive"},
		{"negative timeout", NewHTTPRequestBuilder().URL(testURL).Timeout(-1), "timeout must be positive"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := tt.builder.Build()
			if err == nil || err.Error() != tt.want {
				t.Errorf("Build() error = %v, want %q", err, tt.want)
			}
		})
	}
}

func TestBuiltRequestIsASnapshotUnaffectedByLaterBuilderSteps(t *testing.T) {
	builder := NewHTTPRequestBuilder().Method("POST").URL(testURL).Header("Accept", "application/json").Body("a")
	first, err := builder.Build()
	if err != nil {
		t.Fatal(err)
	}

	second, err := builder.Header("X-Debug", "true").Query("page", "3").Body("b").Timeout(1).Build()
	if err != nil {
		t.Fatal(err)
	}

	if len(first.Headers()) != 1 || len(first.query) != 0 || first.timeoutSeconds != 30 || *first.body != "a" {
		t.Errorf("first changed: %+v", first)
	}
	if len(second.Headers()) != 2 || second.query["page"] != "3" || *second.body != "b" {
		t.Errorf("second = %+v", second)
	}
}

func TestHeadersAccessorReturnsACopy(t *testing.T) {
	req, _ := NewHTTPRequestBuilder().URL(testURL).Header("Accept", "application/json").Build()

	req.Headers()["Accept"] = "text/html"

	if got := req.Headers()["Accept"]; got != "application/json" {
		t.Errorf("Accept = %s, the request was mutated", got)
	}
}

func TestDirectorJSONPostPresetDrivesTheBuilderThroughItsSteps(t *testing.T) {
	req, err := JSONPost("https://api.example.com/orders", `{"qty":2}`).Build()
	if err != nil {
		t.Fatal(err)
	}

	h := req.Headers()
	if req.Method() != "POST" || h["Accept"] != "application/json" || h["Content-Type"] != "application/json" {
		t.Errorf("request = %s", req)
	}
	if req.body == nil || *req.body != `{"qty":2}` {
		t.Errorf("body = %v", req.body)
	}
}

func TestDirectorPresetReturnsABuilderThatAcceptsExtraSteps(t *testing.T) {
	req, err := AuthenticatedGet("https://api.example.com/me", "t0k").Query("lang", "en").Timeout(10).Build()
	if err != nil {
		t.Fatal(err)
	}

	if req.Method() != "GET" || req.Headers()["Authorization"] != "Bearer t0k" {
		t.Errorf("request = %s", req)
	}
	if req.query["lang"] != "en" || req.timeoutSeconds != 10 || req.body != nil {
		t.Errorf("request = %s", req)
	}
}

func TestEachDirectorCallStartsFromAFreshBuilder(t *testing.T) {
	first := AuthenticatedGet(testURL, "a")
	second := AuthenticatedGet(testURL, "b")

	first.Header("X-Only-First", "1")

	req, _ := second.Build()
	if _, ok := req.Headers()["X-Only-First"]; ok || first == second {
		t.Error("director presets share a builder")
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
