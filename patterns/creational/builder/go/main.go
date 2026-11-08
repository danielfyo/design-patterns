// Builder pattern: an HTTP request builder with a fluent interface,
// validation in Build() and a director with ready-made recipes.
//
// Run with: go run ./patterns/creational/builder/go
package main

import (
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"
)

// HTTPRequest is the Product: an immutable HTTP request. Its fields are
// unexported, so once built it can only be read, never changed. (Go spells the
// initialism "HTTP"; the other languages use HttpRequest.)
type HTTPRequest struct {
	method         string
	url            string
	headers        map[string]string
	query          map[string]string
	body           *string
	timeoutSeconds int
}

func (r HTTPRequest) Method() string { return r.method }
func (r HTTPRequest) URL() string    { return r.url }

// Headers returns a copy, so callers cannot mutate the request.
func (r HTTPRequest) Headers() map[string]string { return maps.Clone(r.headers) }

// String renders the request deterministically (map keys are sorted).
func (r HTTPRequest) String() string {
	var sb strings.Builder
	sb.WriteString(r.method + " " + r.url)
	if len(r.query) > 0 {
		pairs := make([]string, 0, len(r.query))
		for _, k := range slices.Sorted(maps.Keys(r.query)) {
			pairs = append(pairs, k+"="+r.query[k])
		}
		sb.WriteString("?" + strings.Join(pairs, "&"))
	}
	for _, name := range slices.Sorted(maps.Keys(r.headers)) {
		fmt.Fprintf(&sb, "\n  %s: %s", name, r.headers[name])
	}
	fmt.Fprintf(&sb, "\n  timeout: %ds", r.timeoutSeconds)
	body := "(none)"
	if r.body != nil {
		body = *r.body
	}
	sb.WriteString("\n  body: " + body)
	return sb.String()
}

// HTTPRequestBuilder is the Builder: it collects the parts step by step through
// chained methods and validates them all at once in Build.
type HTTPRequestBuilder struct {
	method         string
	url            string
	headers        map[string]string
	query          map[string]string
	body           *string
	timeoutSeconds int
}

// NewHTTPRequestBuilder returns a builder with sensible defaults.
func NewHTTPRequestBuilder() *HTTPRequestBuilder {
	return &HTTPRequestBuilder{
		method:         "GET",
		headers:        map[string]string{},
		query:          map[string]string{},
		timeoutSeconds: 30,
	}
}

func (b *HTTPRequestBuilder) Method(m string) *HTTPRequestBuilder {
	b.method = strings.ToUpper(m)
	return b
}
func (b *HTTPRequestBuilder) URL(u string) *HTTPRequestBuilder { b.url = u; return b }
func (b *HTTPRequestBuilder) Header(name, value string) *HTTPRequestBuilder {
	b.headers[name] = value
	return b
}
func (b *HTTPRequestBuilder) Query(name, value string) *HTTPRequestBuilder {
	b.query[name] = value
	return b
}
func (b *HTTPRequestBuilder) Body(body string) *HTTPRequestBuilder { b.body = &body; return b }
func (b *HTTPRequestBuilder) Timeout(seconds int) *HTTPRequestBuilder {
	b.timeoutSeconds = seconds
	return b
}

// Build validates the combination of parts and returns an immutable snapshot.
// The maps are cloned so later builder calls cannot leak into the product.
func (b *HTTPRequestBuilder) Build() (HTTPRequest, error) {
	if b.url == "" {
		return HTTPRequest{}, errors.New("url is required")
	}
	if b.body != nil && (b.method == "GET" || b.method == "HEAD") {
		return HTTPRequest{}, fmt.Errorf("%s requests cannot have a body", b.method)
	}
	if b.timeoutSeconds <= 0 {
		return HTTPRequest{}, errors.New("timeout must be positive")
	}
	var body *string
	if b.body != nil {
		copied := *b.body
		body = &copied
	}
	return HTTPRequest{
		method:         b.method,
		url:            b.url,
		headers:        maps.Clone(b.headers),
		query:          maps.Clone(b.query),
		body:           body,
		timeoutSeconds: b.timeoutSeconds,
	}, nil
}

// JSONPost is a Director recipe: it drives the builder through the steps of a
// JSON POST and hands the builder back so the caller can add more steps.
func JSONPost(url, body string) *HTTPRequestBuilder {
	return NewHTTPRequestBuilder().
		Method("POST").
		URL(url).
		Header("Accept", "application/json").
		Header("Content-Type", "application/json").
		Body(body)
}

// AuthenticatedGet is a Director recipe for a GET with a bearer token.
func AuthenticatedGet(url, token string) *HTTPRequestBuilder {
	return NewHTTPRequestBuilder().
		Method("GET").
		URL(url).
		Header("Authorization", "Bearer "+token).
		Header("Accept", "application/json")
}

func show(b *HTTPRequestBuilder) {
	req, err := b.Build()
	if err != nil {
		fmt.Println("  error:", err)
		return
	}
	fmt.Println("  " + strings.ReplaceAll(req.String(), "\n", "\n  "))
}

func main() {
	fmt.Println("=== Builder Pattern: HTTP request builder ===")

	fmt.Println("1) Step by step with the fluent builder:")
	show(NewHTTPRequestBuilder().
		URL("https://api.example.com/users").
		Header("X-Request-Id", "req-001").
		Header("Accept", "application/json").
		Query("sort", "name").
		Query("page", "2").
		Timeout(5))

	fmt.Println("2) Director preset jsonPost(url, body):")
	show(JSONPost("https://api.example.com/orders", `{"sku":"A-42","qty":2}`))

	fmt.Println("3) Preset authenticatedGet(url, token) + extra steps:")
	show(AuthenticatedGet("https://api.example.com/me", "demo-token-123").
		Query("lang", "en").
		Query("fields", "name,email").
		Timeout(10))

	fmt.Println("4) build() validates before creating the product:")
	invalid := []struct {
		label string
		make  func() *HTTPRequestBuilder
	}{
		{"no url", func() *HTTPRequestBuilder { return NewHTTPRequestBuilder().Method("GET") }},
		{"GET with body", func() *HTTPRequestBuilder {
			return NewHTTPRequestBuilder().URL("https://api.example.com/users").Body("{}")
		}},
		{"timeout 0", func() *HTTPRequestBuilder { return JSONPost("https://api.example.com/orders", "{}").Timeout(0) }},
	}
	for _, c := range invalid {
		if _, err := c.make().Build(); err != nil {
			fmt.Printf("  %-13s -> error: %v\n", c.label, err)
		} else {
			fmt.Printf("  %-13s -> built\n", c.label)
		}
	}

	fmt.Println("5) Built requests are immutable snapshots:")
	builder := AuthenticatedGet("https://api.example.com/me", "demo-token-123")
	first, _ := builder.Build()
	second, _ := builder.Header("X-Debug", "true").Build()
	fmt.Printf("  first has %d headers, second has %d headers\n", len(first.Headers()), len(second.Headers()))
}
