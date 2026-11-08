package main

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

var testTokens = map[string]string{"token-alice": "alice", "token-bob": "bob"}

func buildPipeline(limit int) Handler {
	head := &AuthenticationHandler{Tokens: testTokens}
	head.SetNext(NewRateLimitHandler(limit)).SetNext(&ValidationHandler{}).SetNext(&OrderController{})
	return head
}

func order(tok *string, ip, body, path string) *Request {
	return &Request{Method: "POST", Path: path, Token: tok, IP: ip, Body: body}
}

// probe is a handler that records how many requests reached it.
type probe struct {
	BaseHandler
	calls int
}

func (p *probe) Handle(*Request) Response {
	p.calls++
	return Response{200, "probe"}
}

func TestAValidRequestTravelsTheWholeChain(t *testing.T) {
	var resp Response
	out := captureStdout(t, func() {
		resp = buildPipeline(2).Handle(order(token("token-alice"), "10.0.0.1", "2x coffee", "/orders"))
	})

	if want := (Response{200, "Order accepted for alice: 2x coffee"}); resp != want {
		t.Errorf("response = %v, want %v", resp, want)
	}
	wantOut := "  [Authentication] ok, user=alice\n  [RateLimit] 10.0.0.1 request 1/2\n" +
		"  [Validation] ok\n  [OrderController] order accepted\n"
	if out != wantOut {
		t.Errorf("trace = %q, want %q", out, wantOut)
	}
}

func TestAuthenticationShortCircuitsWithoutCallingTheNextHandler(t *testing.T) {
	tests := []struct {
		name    string
		tok     *string
		message string
	}{
		{"missing", nil, "Missing token"},
		{"invalid", token("forged-token"), "Invalid token"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := &probe{}
			auth := &AuthenticationHandler{Tokens: testTokens}
			auth.SetNext(p)

			var resp Response
			captureStdout(t, func() { resp = auth.Handle(order(tt.tok, "10.0.0.1", "x", "/orders")) })

			if want := (Response{401, tt.message}); resp != want {
				t.Errorf("response = %v, want %v", resp, want)
			}
			if p.calls != 0 {
				t.Errorf("next handler called %d times, want 0", p.calls)
			}
		})
	}
}

func TestAuthenticationSetsTheUserForLaterHandlers(t *testing.T) {
	req := order(token("token-bob"), "10.0.0.1", "x", "/orders")
	auth := &AuthenticationHandler{Tokens: testTokens}
	auth.SetNext(&probe{})

	captureStdout(t, func() { auth.Handle(req) })

	if req.User != "bob" {
		t.Errorf("User = %q, want bob", req.User)
	}
}

func TestRateLimitCountsPerIPAndRejectsOnceTheLimitIsExceeded(t *testing.T) {
	p := &probe{}
	limiter := NewRateLimitHandler(2)
	limiter.SetNext(p)

	var got []int
	captureStdout(t, func() {
		for _, ip := range []string{"10.0.0.1", "10.0.0.1", "10.0.0.1", "10.0.0.2"} {
			got = append(got, limiter.Handle(order(token("t"), ip, "x", "/orders")).Status)
		}
	})

	want := []int{200, 200, 429, 200}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("statuses = %v, want %v", got, want)
			break
		}
	}
	if p.calls != 3 {
		t.Errorf("next handler called %d times, want 3", p.calls)
	}
}

func TestValidationRejectsAnEmptyBody(t *testing.T) {
	for _, body := range []string{"", "   "} {
		t.Run(strings.ReplaceAll(body, " ", "_"), func(t *testing.T) {
			var resp Response
			out := captureStdout(t, func() {
				resp = buildPipeline(2).Handle(order(token("token-alice"), "10.0.0.1", body, "/orders"))
			})

			if want := (Response{400, "Body must not be empty"}); resp != want {
				t.Errorf("response = %v, want %v", resp, want)
			}
			if strings.Contains(out, "[OrderController]") {
				t.Errorf("controller was reached:\n%s", out)
			}
		})
	}
}

func TestARequestNobodyHandlesFallsOffTheEndWith404(t *testing.T) {
	var resp Response
	out := captureStdout(t, func() {
		resp = buildPipeline(2).Handle(order(token("token-bob"), "10.0.0.3", "invoice", "/invoices"))
	})

	if want := (Response{404, "No handler for /invoices"}); resp != want {
		t.Errorf("response = %v, want %v", resp, want)
	}
	if !strings.Contains(out, "[OrderController] not my route, passing on") {
		t.Errorf("trace = %q", out)
	}
}

func TestSetNextReturnsTheHandlerItReceives(t *testing.T) {
	head := &ValidationHandler{}
	next := &OrderController{}

	if got := head.SetNext(next); got != next {
		t.Errorf("SetNext returned %v, want the handler it received", got)
	}
}

func TestResponseFormatsStatusReasonAndMessage(t *testing.T) {
	tests := []struct {
		status int
		want   string
	}{
		{200, "200 OK - done"},
		{429, "429 Too Many Requests - done"},
		{418, "418 Unknown - done"},
	}
	for _, tt := range tests {
		if got := (Response{tt.status, "done"}).String(); got != tt.want {
			t.Errorf("String() = %q, want %q", got, tt.want)
		}
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
