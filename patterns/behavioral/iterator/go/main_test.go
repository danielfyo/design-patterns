package main

import (
	"bytes"
	"errors"
	"io"
	"os"
	"slices"
	"testing"
)

func drain(t *testing.T, it ProductIterator) []int {
	t.Helper()
	var ids []int
	for it.HasNext() {
		p, err := it.Next()
		if err != nil {
			t.Fatalf("Next() error = %v", err)
		}
		ids = append(ids, p.ID)
	}
	return ids
}

func TestExplicitIteratorWalksEveryProductInOrderAcrossPages(t *testing.T) {
	api := NewProductAPI()
	var ids []int
	captureStdout(t, func() { ids = drain(t, ProductCatalog{api: api, pageSize: 3}.CreateIterator()) })

	if want := []int{1, 2, 3, 4, 5, 6, 7}; !slices.Equal(ids, want) {
		t.Errorf("ids = %v, want %v", ids, want)
	}
	if api.RequestCount != 3 {
		t.Errorf("RequestCount = %d, want 3", api.RequestCount)
	}
}

func TestExplicitIteratorFetchesPagesLazilyAndOnlyOnce(t *testing.T) {
	captureStdout(t, func() {
		api := NewProductAPI()
		it := ProductCatalog{api: api, pageSize: 3}.CreateIterator()
		if api.RequestCount != 0 {
			t.Fatalf("requests before use = %d, want 0", api.RequestCount)
		}

		it.HasNext()
		it.HasNext()
		if api.RequestCount != 1 {
			t.Fatalf("requests after HasNext twice = %d, want 1", api.RequestCount)
		}

		for range 3 {
			_, _ = it.Next()
		}
		if api.RequestCount != 1 {
			t.Fatalf("requests after first page = %d, want 1", api.RequestCount)
		}

		_, _ = it.Next()
		if api.RequestCount != 2 {
			t.Errorf("requests after 4th item = %d, want 2", api.RequestCount)
		}
	})
}

func TestNextPastTheEndReturnsErrNoMoreProducts(t *testing.T) {
	captureStdout(t, func() {
		it := ProductCatalog{api: NewProductAPI(), pageSize: 3}.CreateIterator()
		drain(t, it)

		if it.HasNext() {
			t.Error("HasNext() = true after the last product")
		}
		if _, err := it.Next(); !errors.Is(err, ErrNoMoreProducts) {
			t.Errorf("Next() error = %v, want ErrNoMoreProducts", err)
		}
	})
}

func TestEachIteratorKeepsItsOwnPosition(t *testing.T) {
	captureStdout(t, func() {
		catalog := ProductCatalog{api: NewProductAPI(), pageSize: 3}
		first, second := catalog.CreateIterator(), catalog.CreateIterator()

		_, _ = first.Next()
		_, _ = first.Next()

		if p, _ := first.Next(); p.ID != 3 {
			t.Errorf("first iterator third item = %d, want 3", p.ID)
		}
		if p, _ := second.Next(); p.ID != 1 {
			t.Errorf("second iterator first item = %d, want 1", p.ID)
		}
	})
}

func TestPageSizeDecidesHowManyRequestsAFullWalkNeeds(t *testing.T) {
	tests := []struct{ pageSize, requests int }{{1, 7}, {3, 3}, {7, 1}, {10, 1}}
	for _, tt := range tests {
		api := NewProductAPI()
		var ids []int
		captureStdout(t, func() { ids = drain(t, ProductCatalog{api: api, pageSize: tt.pageSize}.CreateIterator()) })

		if len(ids) != 7 || api.RequestCount != tt.requests {
			t.Errorf("pageSize %d: %d products, %d requests; want 7, %d",
				tt.pageSize, len(ids), api.RequestCount, tt.requests)
		}
	}
}

func TestRangeOverFuncYieldsTheSameProducts(t *testing.T) {
	var names []string
	captureStdout(t, func() {
		for p := range (ProductCatalog{api: NewProductAPI(), pageSize: 3}).All() {
			names = append(names, p.Name)
		}
	})

	want := []string{"Keyboard", "Mouse", "Monitor", "Webcam", "Headset", "USB hub", "Desk lamp"}
	if !slices.Equal(names, want) {
		t.Errorf("names = %v, want %v", names, want)
	}
}

func TestStoppingEarlyNeverFetchesTheRemainingPages(t *testing.T) {
	api := NewProductAPI()
	count := 0
	out := captureStdout(t, func() {
		for range (ProductCatalog{api: api, pageSize: 3}).All() {
			count++
			if count == 4 {
				break
			}
		}
	})

	if count != 4 || api.RequestCount != 2 {
		t.Errorf("got %d products, %d requests; want 4, 2", count, api.RequestCount)
	}
	if want := "[api] fetching page 1\n[api] fetching page 2\n"; out != want {
		t.Errorf("output = %q, want %q", out, want)
	}
}

func TestSequenceDoesNothingUntilItIsRanged(t *testing.T) {
	api := NewProductAPI()

	_ = ProductCatalog{api: api, pageSize: 3}.All()

	if api.RequestCount != 0 {
		t.Errorf("RequestCount = %d, want 0", api.RequestCount)
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
