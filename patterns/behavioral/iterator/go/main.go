// Iterator pattern: walk a paginated API one product at a time.
//
// Run with: go run ./patterns/behavioral/iterator/go
package main

import (
	"errors"
	"fmt"
	"iter"
)

// Product is an item of the collection we iterate over. Prices are in cents.
type Product struct {
	ID         int
	Name       string
	PriceCents int64
}

// Page is one page of results, as a paginated REST API would return it.
type Page struct {
	Items   []Product
	HasMore bool
}

// ProductAPI is a fake remote API that returns products page by page
// (think GET /products?page=2&size=3).
type ProductAPI struct {
	products     []Product
	RequestCount int
}

// NewProductAPI returns an API backed by an in-memory product list.
func NewProductAPI() *ProductAPI {
	return &ProductAPI{products: []Product{
		{1, "Keyboard", 4999},
		{2, "Mouse", 1999},
		{3, "Monitor", 18900},
		{4, "Webcam", 5950},
		{5, "Headset", 7990},
		{6, "USB hub", 2400},
		{7, "Desk lamp", 3475},
	}}
}

// GetPage returns page pageNumber (1-based).
func (a *ProductAPI) GetPage(pageNumber, pageSize int) Page {
	a.RequestCount++
	fmt.Printf("[api] fetching page %d\n", pageNumber)
	start := min((pageNumber-1)*pageSize, len(a.products))
	end := min(start+pageSize, len(a.products))
	return Page{Items: a.products[start:end], HasMore: end < len(a.products)}
}

// ProductIterator is the Iterator interface in its classic GoF shape.
type ProductIterator interface {
	HasNext() bool
	Next() (Product, error)
}

// pagedProductIterator is the Concrete Iterator: it walks the products one by
// one and fetches the next page only when the current one is exhausted.
type pagedProductIterator struct {
	api        *ProductAPI
	pageSize   int
	buffer     []Product
	index      int
	pageNumber int
	hasMore    bool
}

func (it *pagedProductIterator) HasNext() bool {
	if it.index < len(it.buffer) {
		return true
	}
	if !it.hasMore {
		return false
	}
	it.pageNumber++
	page := it.api.GetPage(it.pageNumber, it.pageSize)
	it.buffer, it.hasMore, it.index = page.Items, page.HasMore, 0
	return len(it.buffer) > 0
}

// ErrNoMoreProducts is returned by Next when the iteration is over.
var ErrNoMoreProducts = errors.New("no more products")

func (it *pagedProductIterator) Next() (Product, error) {
	if !it.HasNext() {
		return Product{}, ErrNoMoreProducts
	}
	p := it.buffer[it.index]
	it.index++
	return p, nil
}

// ProductCatalog is the Aggregate: it hands out iterators. It offers both the
// explicit GoF iterator and the idiomatic Go 1.23 form (iter.Seq).
type ProductCatalog struct {
	api      *ProductAPI
	pageSize int
}

// CreateIterator is the factory method for the explicit iterator.
func (c ProductCatalog) CreateIterator() ProductIterator {
	return &pagedProductIterator{api: c.api, pageSize: c.pageSize, hasMore: true}
}

// All is the idiomatic Go 1.23 iterator: a range-over-func sequence. The loop
// body is the yield function; when the caller breaks, yield returns false and
// we stop fetching pages.
func (c ProductCatalog) All() iter.Seq[Product] {
	return func(yield func(Product) bool) {
		for pageNumber := 1; ; pageNumber++ {
			page := c.api.GetPage(pageNumber, c.pageSize)
			for _, p := range page.Items {
				if !yield(p) {
					return
				}
			}
			if !page.HasMore {
				return
			}
		}
	}
}

func printProduct(p Product) {
	fmt.Printf("  #%d %-10s $%d.%02d\n", p.ID, p.Name, p.PriceCents/100, p.PriceCents%100)
}

func main() {
	fmt.Println("=== Iterator Pattern: Paginated API results ===")

	// 1) The classic GoF iterator: the client only knows HasNext()/Next().
	fmt.Println("1) Explicit iterator: hasNext() / next()")
	api := NewProductAPI()
	it := ProductCatalog{api: api, pageSize: 3}.CreateIterator()
	count := 0
	for it.HasNext() {
		p, _ := it.Next()
		printProduct(p)
		count++
	}
	fmt.Printf("Done: %d products, %d requests\n", count, api.RequestCount)

	// 2) The idiomatic form: range over an iter.Seq. Breaking out of the loop
	//    stops the sequence, so the last page is never requested.
	fmt.Println("2) Idiomatic loop, stopping after 4 products")
	api = NewProductAPI()
	count = 0
	for p := range (ProductCatalog{api: api, pageSize: 3}).All() {
		printProduct(p)
		count++
		if count == 4 {
			break
		}
	}
	fmt.Printf("Done: %d products, %d requests (page 3 was never fetched)\n", count, api.RequestCount)
}
