package main

import (
	"bytes"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
)

var (
	editor = User{"alice", "editor"}
	viewer = User{"bob", "viewer"}
)

func TestVirtualProxyDoesNotCreateTheRealStoreUntilFirstRequest(t *testing.T) {
	var proxy *DocumentStoreProxy
	out := captureStdout(t, func() { proxy = NewDocumentStoreProxy() })

	if proxy.IsRealStoreCreated() || out != "" {
		t.Fatalf("real store created eagerly (output %q)", out)
	}

	captureStdout(t, func() { _, _ = proxy.GetDocument("doc-1", editor) })

	if !proxy.IsRealStoreCreated() {
		t.Error("real store should exist after the first request")
	}
}

func TestRealStoreIsCreatedOnlyOnce(t *testing.T) {
	proxy := NewDocumentStoreProxy()

	out := captureStdout(t, func() {
		_, _ = proxy.GetDocument("doc-1", editor)
		_, _ = proxy.GetDocument("doc-2", editor)
	})

	if n := strings.Count(out, "[remote] connecting"); n != 1 {
		t.Errorf("connections = %d, want 1", n)
	}
}

func TestCachingProxyFetchesEachDocumentFromTheRemoteStoreOnce(t *testing.T) {
	proxy := NewDocumentStoreProxy()
	var store DocumentStore = proxy
	var first, second Document

	out := captureStdout(t, func() {
		first, _ = store.GetDocument("doc-1", editor)
		second, _ = store.GetDocument("doc-1", viewer)
	})

	if first != second {
		t.Errorf("first=%+v second=%+v", first, second)
	}
	if n := strings.Count(out, "[remote] fetching doc-1"); n != 1 {
		t.Errorf("remote fetches in output = %d, want 1", n)
	}
	if proxy.Requests != 2 || proxy.RemoteFetches != 1 {
		t.Errorf("Requests=%d RemoteFetches=%d, want 2 and 1", proxy.Requests, proxy.RemoteFetches)
	}
}

func TestProtectionProxyChecksRoles(t *testing.T) {
	tests := []struct {
		user    User
		wantErr bool
	}{
		{editor, false},
		{viewer, true},
	}
	for _, tt := range tests {
		t.Run(tt.user.Role, func(t *testing.T) {
			proxy := NewDocumentStoreProxy()
			var doc Document
			var err error
			captureStdout(t, func() { doc, err = proxy.GetDocument("doc-2", tt.user) })

			if tt.wantErr {
				if !errors.Is(err, ErrAccessDenied) {
					t.Fatalf("err = %v, want ErrAccessDenied", err)
				}
				if want := "access denied: viewer cannot read confidential doc-2"; err.Error() != want {
					t.Errorf("err = %q, want %q", err, want)
				}
				return
			}
			if err != nil || doc != (Document{"doc-2", "Merger plan", "confidential"}) {
				t.Errorf("GetDocument() = %+v, %v", doc, err)
			}
		})
	}
}

func TestProtectionIsCheckedEvenWhenTheDocumentIsCached(t *testing.T) {
	proxy := NewDocumentStoreProxy()
	var err error

	captureStdout(t, func() {
		_, _ = proxy.GetDocument("doc-2", editor)
		_, err = proxy.GetDocument("doc-2", viewer)
	})

	if !errors.Is(err, ErrAccessDenied) {
		t.Errorf("err = %v, want ErrAccessDenied", err)
	}
	if proxy.RemoteFetches != 1 || proxy.Requests != 2 {
		t.Errorf("Requests=%d RemoteFetches=%d, want 2 and 1", proxy.Requests, proxy.RemoteFetches)
	}
}

func TestDeniedRequestStillWarmsTheCache(t *testing.T) {
	proxy := NewDocumentStoreProxy()

	out := captureStdout(t, func() {
		_, _ = proxy.GetDocument("doc-2", viewer)
		_, _ = proxy.GetDocument("doc-2", editor)
	})

	if proxy.RemoteFetches != 1 || !strings.Contains(out, "[proxy] cache hit doc-2") {
		t.Errorf("RemoteFetches=%d, output:\n%s", proxy.RemoteFetches, out)
	}
}

func TestUnknownDocumentIsNotCached(t *testing.T) {
	proxy := NewDocumentStoreProxy()
	var err error

	captureStdout(t, func() { _, err = proxy.GetDocument("doc-404", editor) })

	if err == nil || errors.Is(err, ErrAccessDenied) {
		t.Errorf("err = %v, want a not-found error", err)
	}
	if proxy.RemoteFetches != 0 {
		t.Errorf("RemoteFetches = %d, want 0", proxy.RemoteFetches)
	}
}

func TestRealSubjectPerformsNoAuthorizationOfItsOwn(t *testing.T) {
	var doc Document
	var err error

	captureStdout(t, func() {
		var real DocumentStore = NewRemoteDocumentStore()
		doc, err = real.GetDocument("doc-2", viewer)
	})

	if err != nil || doc.Classification != "confidential" {
		t.Errorf("GetDocument() = %+v, %v", doc, err)
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
