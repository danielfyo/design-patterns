// Chain of Responsibility pattern: an HTTP request middleware pipeline.
//
// Run with: go run ./patterns/behavioral/chain-of-responsibility/go
package main

import (
	"fmt"
	"strings"
)

// Request travels along the chain. User is set by the authentication handler.
// Token is a pointer so "no token" (nil) differs from an empty token.
type Request struct {
	Method string
	Path   string
	Token  *string
	IP     string
	Body   string
	User   string
}

// Response is the result produced by whichever handler ends the chain.
type Response struct {
	Status  int
	Message string
}

var reasons = map[int]string{
	200: "OK",
	400: "Bad Request",
	401: "Unauthorized",
	404: "Not Found",
	429: "Too Many Requests",
}

func (r Response) String() string {
	reason, ok := reasons[r.Status]
	if !ok {
		reason = "Unknown"
	}
	return fmt.Sprintf("%d %s - %s", r.Status, reason, r.Message)
}

// Handler is the common interface of every link in the chain. SetNext returns
// the handler it receives so chains can be built fluently.
type Handler interface {
	SetNext(next Handler) Handler
	Handle(r *Request) Response
}

// BaseHandler stores the successor and forwards to it. Concrete handlers embed
// it and call BaseHandler.Handle to pass the request on. If nobody handled the
// request by the end of the chain, it answers 404.
type BaseHandler struct {
	next Handler
}

func (b *BaseHandler) SetNext(next Handler) Handler {
	b.next = next
	return next
}

func (b *BaseHandler) Handle(r *Request) Response {
	if b.next != nil {
		return b.next.Handle(r)
	}
	return Response{404, "No handler for " + r.Path}
}

// AuthenticationHandler is a concrete handler: it rejects requests without a
// known token (401).
type AuthenticationHandler struct {
	BaseHandler
	Tokens map[string]string
}

func (h *AuthenticationHandler) Handle(r *Request) Response {
	if r.Token == nil {
		fmt.Println("  [Authentication] rejected: missing token")
		return Response{401, "Missing token"}
	}
	user, ok := h.Tokens[*r.Token]
	if !ok {
		fmt.Println("  [Authentication] rejected: invalid token")
		return Response{401, "Invalid token"}
	}
	r.User = user
	fmt.Printf("  [Authentication] ok, user=%s\n", user)
	return h.BaseHandler.Handle(r)
}

// RateLimitHandler is a concrete handler: it allows at most Limit requests per
// IP (429 afterwards). The in-memory counter keeps the demo deterministic.
type RateLimitHandler struct {
	BaseHandler
	Limit  int
	counts map[string]int
}

func NewRateLimitHandler(limit int) *RateLimitHandler {
	return &RateLimitHandler{Limit: limit, counts: map[string]int{}}
}

func (h *RateLimitHandler) Handle(r *Request) Response {
	h.counts[r.IP]++
	count := h.counts[r.IP]
	if count > h.Limit {
		fmt.Printf("  [RateLimit] rejected: %s exceeded %d requests\n", r.IP, h.Limit)
		return Response{429, "Rate limit exceeded"}
	}
	fmt.Printf("  [RateLimit] %s request %d/%d\n", r.IP, count, h.Limit)
	return h.BaseHandler.Handle(r)
}

// ValidationHandler is a concrete handler: it rejects empty bodies (400).
type ValidationHandler struct {
	BaseHandler
}

func (h *ValidationHandler) Handle(r *Request) Response {
	if strings.TrimSpace(r.Body) == "" {
		fmt.Println("  [Validation] rejected: empty body")
		return Response{400, "Body must not be empty"}
	}
	fmt.Println("  [Validation] ok")
	return h.BaseHandler.Handle(r)
}

// OrderController is the concrete handler at the end of the chain: the
// endpoint. It handles only its own route and passes anything else on.
type OrderController struct {
	BaseHandler
}

func (h *OrderController) Handle(r *Request) Response {
	if r.Path != "/orders" {
		fmt.Println("  [OrderController] not my route, passing on")
		return h.BaseHandler.Handle(r)
	}
	fmt.Println("  [OrderController] order accepted")
	return Response{200, fmt.Sprintf("Order accepted for %s: %s", r.User, r.Body)}
}

func token(s string) *string { return &s }

func main() {
	fmt.Println("=== Chain of Responsibility Pattern: HTTP request middleware pipeline ===")

	tokens := map[string]string{"token-alice": "alice", "token-bob": "bob"}

	// Build the chain fluently: each SetNext returns the handler it was given.
	pipeline := &AuthenticationHandler{Tokens: tokens}
	pipeline.
		SetNext(NewRateLimitHandler(2)).
		SetNext(&ValidationHandler{}).
		SetNext(&OrderController{})
	fmt.Println("Pipeline: Authentication -> RateLimit(2 per IP) -> Validation -> OrderController")

	requests := []*Request{
		{"POST", "/orders", token("token-alice"), "10.0.0.1", "2x coffee", ""},
		{"POST", "/orders", nil, "10.0.0.2", "1x tea", ""},
		{"POST", "/orders", token("forged-token"), "10.0.0.2", "1x tea", ""},
		{"POST", "/orders", token("token-alice"), "10.0.0.1", "", ""},
		{"POST", "/orders", token("token-alice"), "10.0.0.1", "1x tea", ""},
		{"POST", "/orders", token("token-bob"), "10.0.0.3", "3x muffin", ""},
		{"POST", "/invoices", token("token-bob"), "10.0.0.3", "invoice #42", ""},
	}

	for i, r := range requests {
		tok := "(none)"
		if r.Token != nil {
			tok = *r.Token
		}
		fmt.Printf("Request %d: %s %s ip=%s token=%s body=\"%s\"\n", i+1, r.Method, r.Path, r.IP, tok, r.Body)
		// The client only knows the head of the chain.
		response := pipeline.Handle(r)
		fmt.Printf("  => %s\n", response)
	}
}
