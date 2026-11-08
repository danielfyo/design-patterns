// Proxy pattern: a lazy, caching, role-checking proxy for a remote document store.
//
// Run with: go run ./patterns/structural/proxy/go
package main

import (
	"errors"
	"fmt"
)

type User struct {
	Name string
	Role string
}

type Document struct {
	ID             string
	Title          string
	Classification string
}

// ErrAccessDenied is wrapped by the protection proxy when a user may not read a document.
var ErrAccessDenied = errors.New("access denied")

// DocumentStore is the Subject interface: shared by the real store and the
// proxy, so clients cannot tell which one they are talking to.
type DocumentStore interface {
	GetDocument(id string, user User) (Document, error)
}

var documents = map[string]Document{
	"doc-1": {"doc-1", "Q3 roadmap", "public"},
	"doc-2": {"doc-2", "Merger plan", "confidential"},
}

// RemoteDocumentStore is the Real Subject: a remote document server. Expensive
// to create (it opens a connection) and every call is a network round trip. It
// trusts its caller and performs no authorization of its own.
type RemoteDocumentStore struct{}

func NewRemoteDocumentStore() *RemoteDocumentStore {
	fmt.Println("[remote] connecting to document server...")
	return &RemoteDocumentStore{}
}

func (r *RemoteDocumentStore) GetDocument(id string, _ User) (Document, error) {
	fmt.Printf("[remote] fetching %s\n", id)
	doc, ok := documents[id]
	if !ok {
		return Document{}, fmt.Errorf("document %s not found", id)
	}
	return doc, nil
}

// DocumentStoreProxy is the Proxy: same interface as the real store, but it
// controls access to it. Virtual (creates the real store lazily), caching
// (remembers fetched documents) and protection (viewers may not read
// confidential documents).
type DocumentStoreProxy struct {
	real          *RemoteDocumentStore
	cache         map[string]Document
	Requests      int
	RemoteFetches int
}

func NewDocumentStoreProxy() *DocumentStoreProxy {
	return &DocumentStoreProxy{cache: map[string]Document{}}
}

func (p *DocumentStoreProxy) IsRealStoreCreated() bool { return p.real != nil }

// realStore is the virtual-proxy part: the real subject is created on first use only.
func (p *DocumentStoreProxy) realStore() *RemoteDocumentStore {
	if p.real == nil {
		fmt.Println("[proxy] creating the real store on first use")
		p.real = NewRemoteDocumentStore()
	}
	return p.real
}

func (p *DocumentStoreProxy) GetDocument(id string, user User) (Document, error) {
	p.Requests++

	// Caching proxy.
	doc, ok := p.cache[id]
	if ok {
		fmt.Printf("[proxy] cache hit %s\n", id)
	} else {
		fmt.Printf("[proxy] cache miss %s\n", id)
		var err error
		if doc, err = p.realStore().GetDocument(id, user); err != nil {
			return Document{}, err
		}
		p.RemoteFetches++
		p.cache[id] = doc
	}

	// Protection proxy: authorize every request, cached or not.
	if user.Role == "viewer" && doc.Classification == "confidential" {
		return Document{}, fmt.Errorf("%w: %s cannot read confidential %s", ErrAccessDenied, user.Role, id)
	}
	return doc, nil
}

func main() {
	fmt.Println("=== Proxy Pattern: Document store proxy ===")

	proxy := NewDocumentStoreProxy()
	var store DocumentStore = proxy // the client only sees the Subject interface
	fmt.Printf("Proxy ready, real store created: %t\n", proxy.IsRealStoreCreated())

	alice := User{"alice", "editor"}
	bob := User{"bob", "viewer"}

	request := func(user User, id string) {
		fmt.Printf("%s (%s) asks for %s\n", user.Name, user.Role, id)
		doc, err := store.GetDocument(id, user)
		if err != nil {
			fmt.Printf("  -> %v\n", err)
			return
		}
		fmt.Printf("  -> %q (%s)\n", doc.Title, doc.Classification)
	}

	request(alice, "doc-1")
	request(bob, "doc-1")
	request(bob, "doc-2")
	request(alice, "doc-2")

	fmt.Printf("Stats: %d requests, %d remote fetches, real store created: %t\n",
		proxy.Requests, proxy.RemoteFetches, proxy.IsRealStoreCreated())
}
