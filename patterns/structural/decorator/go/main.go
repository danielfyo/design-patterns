// Decorator pattern: cross-cutting concerns stacked around a data fetcher.
//
// Run with: go run ./patterns/structural/decorator/go
package main

import (
	"errors"
	"fmt"
)

// DataFetcher is the Component interface: anything that can fetch the body of a URL.
type DataFetcher interface {
	Fetch(url string) (string, error)
}

// ErrUnavailable is returned by the fake server when a call fails.
var ErrUnavailable = errors.New("503 Service Unavailable")

var responses = map[string]string{
	"/users":  `{"users":["ada","linus"]}`,
	"/orders": `{"orders":[101,102]}`,
}

// HttpFetcher is the Concrete Component: an in-memory fake HTTP client. It
// returns canned bodies and fails the first N calls for selected URLs, so
// retries are deterministic.
type HttpFetcher struct {
	remainingFailures map[string]int
}

// NewHttpFetcher copies failFirst so the caller's map is never mutated.
func NewHttpFetcher(failFirst map[string]int) *HttpFetcher {
	remaining := make(map[string]int, len(failFirst))
	for url, n := range failFirst {
		remaining[url] = n
	}
	return &HttpFetcher{remainingFailures: remaining}
}

func (h *HttpFetcher) Fetch(url string) (string, error) {
	fmt.Printf("[http] GET %s\n", url)
	if h.remainingFailures[url] > 0 {
		h.remainingFailures[url]--
		return "", ErrUnavailable
	}
	if body, ok := responses[url]; ok {
		return body, nil
	}
	return "{}", nil
}

// FetcherDecorator is the Base Decorator. Concrete decorators embed it, so
// they inherit a forwarding Fetch and only override what they need.
type FetcherDecorator struct {
	Inner DataFetcher
}

func (d FetcherDecorator) Fetch(url string) (string, error) { return d.Inner.Fetch(url) }

// LoggingFetcher is a Concrete Decorator: it logs every call and its outcome.
type LoggingFetcher struct{ FetcherDecorator }

func NewLoggingFetcher(inner DataFetcher) *LoggingFetcher {
	return &LoggingFetcher{FetcherDecorator{Inner: inner}}
}

func (l *LoggingFetcher) Fetch(url string) (string, error) {
	fmt.Printf("[log] fetch %s\n", url)
	body, err := l.FetcherDecorator.Fetch(url)
	if err != nil {
		fmt.Printf("[log] error %s: %v\n", url, err)
		return "", err
	}
	fmt.Printf("[log] ok %s (%d chars)\n", url, len(body))
	return body, nil
}

// CachingFetcher is a Concrete Decorator: it remembers successful responses by URL.
type CachingFetcher struct {
	FetcherDecorator
	cache map[string]string
}

func NewCachingFetcher(inner DataFetcher) *CachingFetcher {
	return &CachingFetcher{FetcherDecorator{Inner: inner}, map[string]string{}}
}

func (c *CachingFetcher) Fetch(url string) (string, error) {
	if body, ok := c.cache[url]; ok {
		fmt.Printf("[cache] hit %s\n", url)
		return body, nil
	}
	fmt.Printf("[cache] miss %s\n", url)
	body, err := c.FetcherDecorator.Fetch(url)
	if err != nil {
		return "", err
	}
	c.cache[url] = body
	fmt.Printf("[cache] stored %s\n", url)
	return body, nil
}

// RetryFetcher is a Concrete Decorator: it retries failed calls up to MaxAttempts times.
type RetryFetcher struct {
	FetcherDecorator
	MaxAttempts int
}

func NewRetryFetcher(inner DataFetcher, maxAttempts int) *RetryFetcher {
	return &RetryFetcher{FetcherDecorator{Inner: inner}, maxAttempts}
}

func (r *RetryFetcher) Fetch(url string) (string, error) {
	for attempt := 1; ; attempt++ {
		body, err := r.FetcherDecorator.Fetch(url)
		if err == nil {
			return body, nil
		}
		last := attempt >= r.MaxAttempts
		outcome := "retrying"
		if last {
			outcome = "giving up"
		}
		fmt.Printf("[retry] attempt %d/%d failed: %v, %s\n", attempt, r.MaxAttempts, err, outcome)
		if last {
			return "", err
		}
	}
}

func show(f DataFetcher, url string) {
	body, err := f.Fetch(url)
	if err != nil {
		fmt.Printf("error: %v\n", err)
		return
	}
	fmt.Printf("result: %s\n", body)
}

func main() {
	fmt.Println("=== Decorator Pattern: Data fetcher with cross-cutting concerns ===")

	// Stack A: the cache sits outside the retry, so a cached URL never touches the network.
	fmt.Println("Stack A: Logging -> Caching -> Retry(3) -> Http")
	var stackA DataFetcher = NewLoggingFetcher(
		NewCachingFetcher(NewRetryFetcher(NewHttpFetcher(map[string]int{"/users": 2}), 3)))
	show(stackA, "/users")
	show(stackA, "/users")

	// Stack B: same pieces, different order. Logging is inside the retry, so it sees every attempt.
	fmt.Println()
	fmt.Println("Stack B: Retry(3) -> Logging -> Http")
	var stackB DataFetcher = NewRetryFetcher(NewLoggingFetcher(NewHttpFetcher(map[string]int{"/users": 2})), 3)
	show(stackB, "/users")

	// Stack C: retries are not magic. If the server keeps failing, the error reaches the client.
	fmt.Println()
	fmt.Println("Stack C: Retry(2) -> Http")
	var stackC DataFetcher = NewRetryFetcher(NewHttpFetcher(map[string]int{"/orders": 3}), 2)
	show(stackC, "/orders")
}
