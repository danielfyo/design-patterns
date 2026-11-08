package main

import (
	"bytes"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
)

const usersBody = `{"users":["ada","linus"]}`

// countLines counts the output lines that start with prefix.
func countLines(output, prefix string) int {
	n := 0
	for _, line := range strings.Split(output, "\n") {
		if strings.HasPrefix(line, prefix) {
			n++
		}
	}
	return n
}

// countingFetcher is a test double that counts how often the wrapped component is reached.
type countingFetcher struct {
	inner DataFetcher
	calls int
}

func (c *countingFetcher) Fetch(url string) (string, error) {
	c.calls++
	return c.inner.Fetch(url)
}

func TestHttpFetcherReturnsCannedBodiesAndAnEmptyObjectForUnknownURLs(t *testing.T) {
	http := NewHttpFetcher(nil)
	captureStdout(t, func() {
		if got, err := http.Fetch("/users"); err != nil || got != usersBody {
			t.Errorf("/users = %q, %v", got, err)
		}
		if got, err := http.Fetch("/unknown"); err != nil || got != "{}" {
			t.Errorf("/unknown = %q, %v", got, err)
		}
	})
}

func TestNewHttpFetcherDoesNotMutateTheCallersMap(t *testing.T) {
	failFirst := map[string]int{"/users": 1}
	http := NewHttpFetcher(failFirst)

	captureStdout(t, func() { _, _ = http.Fetch("/users") })

	if failFirst["/users"] != 1 {
		t.Errorf("caller map mutated: %v", failFirst)
	}
}

func TestRetryRecoversFromTransientFailures(t *testing.T) {
	f := NewRetryFetcher(NewHttpFetcher(map[string]int{"/users": 2}), 3)
	var body string
	var err error

	out := captureStdout(t, func() { body, err = f.Fetch("/users") })

	if err != nil || body != usersBody {
		t.Fatalf("Fetch() = %q, %v", body, err)
	}
	if n := countLines(out, "[http] GET /users"); n != 3 {
		t.Errorf("http calls = %d, want 3", n)
	}
}

func TestRetryGivesUpAfterMaxAttemptsAndReturnsTheError(t *testing.T) {
	f := NewRetryFetcher(NewHttpFetcher(map[string]int{"/orders": 3}), 2)
	var err error

	out := captureStdout(t, func() { _, err = f.Fetch("/orders") })

	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("err = %v, want ErrUnavailable", err)
	}
	if n := countLines(out, "[http] GET /orders"); n != 2 {
		t.Errorf("http calls = %d, want 2", n)
	}
	if !strings.Contains(out, "attempt 2/2 failed: 503 Service Unavailable, giving up") {
		t.Errorf("missing give-up line:\n%s", out)
	}
}

func TestCachingServesRepeatedRequestsWithoutReachingTheWrappedComponent(t *testing.T) {
	counter := &countingFetcher{inner: NewHttpFetcher(nil)}
	f := NewCachingFetcher(counter)
	var first, second string

	out := captureStdout(t, func() {
		first, _ = f.Fetch("/users")
		second, _ = f.Fetch("/users")
	})

	if first != second || counter.calls != 1 {
		t.Errorf("first=%q second=%q inner calls=%d, want equal bodies and 1 call", first, second, counter.calls)
	}
	if !strings.Contains(out, "[cache] hit /users") {
		t.Errorf("missing cache hit:\n%s", out)
	}
}

func TestCachingDoesNotRememberFailures(t *testing.T) {
	f := NewCachingFetcher(NewHttpFetcher(map[string]int{"/users": 1}))
	var firstErr, secondErr error
	var body string

	out := captureStdout(t, func() {
		_, firstErr = f.Fetch("/users")
		body, secondErr = f.Fetch("/users")
	})

	if firstErr == nil {
		t.Fatal("first call should fail")
	}
	if secondErr != nil || body != usersBody {
		t.Errorf("second call = %q, %v", body, secondErr)
	}
	if strings.Contains(out, "[cache] hit") {
		t.Errorf("failure was cached:\n%s", out)
	}
}

func TestLoggingReportsTheErrorAndReturnsIt(t *testing.T) {
	f := NewLoggingFetcher(NewHttpFetcher(map[string]int{"/users": 1}))
	var err error

	out := captureStdout(t, func() { _, err = f.Fetch("/users") })

	if !errors.Is(err, ErrUnavailable) {
		t.Errorf("err = %v, want ErrUnavailable", err)
	}
	if !strings.Contains(out, "[log] error /users: 503 Service Unavailable") {
		t.Errorf("missing error log:\n%s", out)
	}
}

func TestDecoratorOrderMatters(t *testing.T) {
	tests := []struct {
		name       string
		build      func() DataFetcher
		wantFetch  int
		wantErrors int
	}{
		{
			name: "logging outside retry sees one call",
			build: func() DataFetcher {
				return NewLoggingFetcher(NewRetryFetcher(NewHttpFetcher(map[string]int{"/users": 2}), 3))
			},
			wantFetch: 1, wantErrors: 0,
		},
		{
			name: "logging inside retry sees every attempt",
			build: func() DataFetcher {
				return NewRetryFetcher(NewLoggingFetcher(NewHttpFetcher(map[string]int{"/users": 2})), 3)
			},
			wantFetch: 3, wantErrors: 2,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := tt.build()
			out := captureStdout(t, func() { _, _ = f.Fetch("/users") })

			if n := countLines(out, "[log] fetch /users"); n != tt.wantFetch {
				t.Errorf("log fetch lines = %d, want %d", n, tt.wantFetch)
			}
			if n := countLines(out, "[log] error /users"); n != tt.wantErrors {
				t.Errorf("log error lines = %d, want %d", n, tt.wantErrors)
			}
		})
	}
}

func TestCacheOutsideRetryAnswersTheSecondCallWithoutAnyHTTPRequest(t *testing.T) {
	f := NewCachingFetcher(NewRetryFetcher(NewHttpFetcher(map[string]int{"/users": 2}), 3))
	captureStdout(t, func() { _, _ = f.Fetch("/users") })
	var body string

	out := captureStdout(t, func() { body, _ = f.Fetch("/users") })

	if body != usersBody {
		t.Errorf("body = %q", body)
	}
	if strings.Contains(out, "[http]") {
		t.Errorf("second call reached the network:\n%s", out)
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
