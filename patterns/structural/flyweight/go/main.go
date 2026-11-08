// Flyweight pattern: thousands of map markers sharing a handful of heavy styles.
//
// Run with: go run ./patterns/structural/flyweight/go
package main

import "fmt"

// Fixed byte sizes used for the (deterministic) memory estimate.
const (
	IconBitmapBytes   = 20_000 // the decoded icon bitmap: the heavy part of a style
	StyleFieldsBytes  = 64     // icon name, color, size and object header of a style
	MarkerFieldsBytes = 40     // latitude, longitude, label reference and style reference
)

// MarkerStyle is the Flyweight: intrinsic, immutable state shared by many
// markers. Extrinsic state (position, label) is passed in to Draw instead of
// being stored here.
type MarkerStyle struct {
	Icon       string
	Color      string
	SizePx     int
	IconBitmap []byte // imagine a decoded PNG: this is why styles must be shared
}

func (s *MarkerStyle) Draw(lat, lng float64, label string) string {
	return fmt.Sprintf("draw %s icon (%s, %dpx) at (%.4f, %.4f) label %q", s.Icon, s.Color, s.SizePx, lat, lng, label)
}

// MarkerStyleFactory is the Flyweight Factory: it creates each distinct style
// once and hands out the cached pointer on every later request.
type MarkerStyleFactory struct {
	styles   map[string]*MarkerStyle
	Requests int
}

func NewMarkerStyleFactory() *MarkerStyleFactory {
	return &MarkerStyleFactory{styles: map[string]*MarkerStyle{}}
}

func (f *MarkerStyleFactory) Count() int { return len(f.styles) }

func (f *MarkerStyleFactory) GetStyle(icon, color string, sizePx int) *MarkerStyle {
	f.Requests++
	key := fmt.Sprintf("%s/%s/%dpx", icon, color, sizePx)
	style, ok := f.styles[key]
	if !ok {
		style = &MarkerStyle{Icon: icon, Color: color, SizePx: sizePx, IconBitmap: make([]byte, IconBitmapBytes)}
		f.styles[key] = style
		fmt.Printf("[factory] new style: %s\n", key)
	}
	return style
}

// Marker is the Context: it stores only extrinsic state plus a pointer to the
// shared flyweight.
type Marker struct {
	Lat, Lng float64
	Label    string
	Style    *MarkerStyle
}

func (m Marker) Draw() string { return m.Style.Draw(m.Lat, m.Lng, m.Label) }

type styleSpec struct {
	icon, color string
	sizePx      int
}

func main() {
	fmt.Println("=== Flyweight Pattern: Map markers ===")

	specs := []styleSpec{{"restaurant", "red", 32}, {"hotel", "blue", 32}, {"fuel", "green", 24}}
	const markerCount = 10_000
	factory := NewMarkerStyleFactory()
	markers := make([]Marker, 0, markerCount)
	for i := 0; i < markerCount; i++ {
		s := specs[i%len(specs)]
		lat := 40 + float64(i%100)/100 // deterministic grid of positions
		lng := -3 - float64(i/100)/100
		markers = append(markers, Marker{lat, lng, fmt.Sprintf("Place %d", i), factory.GetStyle(s.icon, s.color, s.sizePx)})
	}

	fmt.Printf("Created %d markers with %d style requests\n", len(markers), factory.Requests)
	fmt.Printf("Style objects created: %d\n", factory.Count())

	// Memory estimate with fixed sizes, so every language prints the same numbers.
	styleBytes := int64(IconBitmapBytes + StyleFieldsBytes)
	without := int64(markerCount) * (styleBytes + MarkerFieldsBytes)
	with := int64(markerCount)*MarkerFieldsBytes + int64(factory.Count())*styleBytes
	fmt.Printf("Memory estimate (icon=%d B, style fields=%d B, marker fields=%d B):\n", IconBitmapBytes, StyleFieldsBytes, MarkerFieldsBytes)
	fmt.Printf("  without flyweight: %d x (%d + %d + %d) = %d B (%.2f MB)\n",
		markerCount, IconBitmapBytes, StyleFieldsBytes, MarkerFieldsBytes, without, float64(without)/1048576)
	fmt.Printf("  with flyweight:    %d x %d + %d x (%d + %d) = %d B (%.2f MB)\n",
		markerCount, MarkerFieldsBytes, factory.Count(), IconBitmapBytes, StyleFieldsBytes, with, float64(with)/1048576)
	fmt.Printf("  saved: %.2f%%\n", (1-float64(with)/float64(without))*100)

	fmt.Println("Rendering a few markers:")
	for _, index := range []int{0, 1, 2, 3, 9999} {
		fmt.Printf("  #%d: %s\n", index, markers[index].Draw())
	}
	fmt.Printf("Markers #0 and #3 share one style object: %t\n", markers[0].Style == markers[3].Style)
}
