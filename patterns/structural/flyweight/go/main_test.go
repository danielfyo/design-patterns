package main

import (
	"bytes"
	"io"
	"os"
	"testing"
)

func TestFactoryReusesTheInstanceForTheSameIntrinsicState(t *testing.T) {
	factory := NewMarkerStyleFactory()
	var first, second *MarkerStyle

	captureStdout(t, func() {
		first = factory.GetStyle("hotel", "blue", 32)
		second = factory.GetStyle("hotel", "blue", 32)
	})

	if first != second {
		t.Error("expected the same pointer for the same style")
	}
	if factory.Count() != 1 {
		t.Errorf("Count() = %d, want 1", factory.Count())
	}
}

func TestFactoryCreatesANewStyleWhenAnyIntrinsicFieldDiffers(t *testing.T) {
	tests := []struct {
		name, icon, color string
		sizePx            int
	}{
		{"icon", "fuel", "blue", 32},
		{"color", "hotel", "red", 32},
		{"size", "hotel", "blue", 24},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			factory := NewMarkerStyleFactory()
			var hotel, other *MarkerStyle
			captureStdout(t, func() {
				hotel = factory.GetStyle("hotel", "blue", 32)
				other = factory.GetStyle(tt.icon, tt.color, tt.sizePx)
			})

			if hotel == other {
				t.Error("expected a distinct style")
			}
			if factory.Count() != 2 {
				t.Errorf("Count() = %d, want 2", factory.Count())
			}
		})
	}
}

func TestFactoryCountsEveryRequestButAnnouncesEachStyleOnce(t *testing.T) {
	factory := NewMarkerStyleFactory()

	out := captureStdout(t, func() {
		for i := 0; i < 5; i++ {
			factory.GetStyle("fuel", "green", 24)
		}
	})

	if factory.Requests != 5 || factory.Count() != 1 {
		t.Errorf("Requests=%d Count=%d, want 5 and 1", factory.Requests, factory.Count())
	}
	if want := "[factory] new style: fuel/green/24px\n"; out != want {
		t.Errorf("output = %q, want %q", out, want)
	}
}

func TestManyMarkersShareAHandfulOfStyleObjects(t *testing.T) {
	specs := []styleSpec{{"restaurant", "red", 32}, {"hotel", "blue", 32}, {"fuel", "green", 24}}
	factory := NewMarkerStyleFactory()
	markers := make([]Marker, 0, 300)

	captureStdout(t, func() {
		for i := 0; i < 300; i++ {
			s := specs[i%3]
			markers = append(markers, Marker{40, -3, "x", factory.GetStyle(s.icon, s.color, s.sizePx)})
		}
	})

	distinct := map[*MarkerStyle]bool{}
	for _, m := range markers {
		distinct[m.Style] = true
	}
	if factory.Count() != 3 || len(distinct) != 3 {
		t.Errorf("Count=%d distinct=%d, want 3 and 3", factory.Count(), len(distinct))
	}
	if markers[0].Style != markers[297].Style {
		t.Error("markers #0 and #297 should share a style")
	}
}

func TestMarkerDrawCombinesExtrinsicAndSharedIntrinsicState(t *testing.T) {
	factory := NewMarkerStyleFactory()
	var style *MarkerStyle
	captureStdout(t, func() { style = factory.GetStyle("restaurant", "red", 32) })

	tests := []struct {
		marker Marker
		want   string
	}{
		{Marker{40.03, -3, "Place 3", style}, `draw restaurant icon (red, 32px) at (40.0300, -3.0000) label "Place 3"`},
		{Marker{40.99, -3.99, "Place 9999", style}, `draw restaurant icon (red, 32px) at (40.9900, -3.9900) label "Place 9999"`},
	}
	for _, tt := range tests {
		if got := tt.marker.Draw(); got != tt.want {
			t.Errorf("Draw() = %q, want %q", got, tt.want)
		}
	}
}

func TestStyleHoldsTheHeavyBitmapWhileMarkersOnlyReferenceIt(t *testing.T) {
	factory := NewMarkerStyleFactory()
	var style *MarkerStyle
	captureStdout(t, func() { style = factory.GetStyle("hotel", "blue", 32) })

	marker := Marker{1, 2, "x", style}

	if len(style.IconBitmap) != IconBitmapBytes {
		t.Errorf("bitmap = %d bytes, want %d", len(style.IconBitmap), IconBitmapBytes)
	}
	if &marker.Style.IconBitmap[0] != &style.IconBitmap[0] {
		t.Error("marker should reference the shared bitmap, not a copy")
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
