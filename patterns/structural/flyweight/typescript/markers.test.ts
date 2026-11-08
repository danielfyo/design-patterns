import { describe, expect, it } from "vitest";
import { Marker, MarkerStyleFactory, STYLE_SPECS, Sizes, createMarkers } from "./markers.ts";

const silent = () => {};

describe("Flyweight: map markers", () => {
  it("reuses the instance for the same intrinsic state", () => {
    const factory = new MarkerStyleFactory(silent);

    const first = factory.getStyle("hotel", "blue", 32);
    const second = factory.getStyle("hotel", "blue", 32);

    expect(first).toBe(second);
    expect(factory.count).toBe(1);
  });

  it.each([
    ["icon", "fuel", "blue", 32],
    ["color", "hotel", "red", 32],
    ["size", "hotel", "blue", 24],
  ])("creates a new style when the %s differs", (_field, icon, color, sizePx) => {
    const factory = new MarkerStyleFactory(silent);
    const hotel = factory.getStyle("hotel", "blue", 32);

    expect(factory.getStyle(icon, color, sizePx)).not.toBe(hotel);
    expect(factory.count).toBe(2);
  });

  it("counts every request but announces each style once", () => {
    const lines: string[] = [];
    const factory = new MarkerStyleFactory((line) => lines.push(line));

    for (let i = 0; i < 5; i++) factory.getStyle("fuel", "green", 24);

    expect(factory.requests).toBe(5);
    expect(factory.count).toBe(1);
    expect(lines).toEqual(["[factory] new style: fuel/green/24px"]);
  });

  it("lets thousands of markers share a handful of style objects", () => {
    const factory = new MarkerStyleFactory(silent);

    const markers = createMarkers(10_000, factory);

    expect(markers).toHaveLength(10_000);
    expect(factory.count).toBe(STYLE_SPECS.length);
    expect(new Set(markers.map((m) => m.style)).size).toBe(3);
    expect(markers[0].style).toBe(markers[3].style);
    expect(markers[0].style).not.toBe(markers[1].style);
  });

  it("keeps the styles when more markers are created with the same factory", () => {
    const factory = new MarkerStyleFactory(silent);
    const before = createMarkers(3, factory);

    const after = createMarkers(300, factory);

    expect(factory.count).toBe(3);
    expect(after[0].style).toBe(before[0].style);
  });

  it("draws by combining extrinsic state with the shared intrinsic state", () => {
    const style = new MarkerStyleFactory(silent).getStyle("restaurant", "red", 32);

    expect(new Marker(40.03, -3, "Place 3", style).draw()).toBe(
      'draw restaurant icon (red, 32px) at (40.0300, -3.0000) label "Place 3"',
    );
    expect(new Marker(40.99, -3.99, "Place 9999", style).draw()).toBe(
      'draw restaurant icon (red, 32px) at (40.9900, -3.9900) label "Place 9999"',
    );
  });

  it("places markers on a deterministic grid", () => {
    const markers = createMarkers(10_000, new MarkerStyleFactory(silent));

    expect(markers[9999].draw()).toBe('draw restaurant icon (red, 32px) at (40.9900, -3.9900) label "Place 9999"');
  });

  it("keeps the heavy bitmap in the shared style only", () => {
    const style = new MarkerStyleFactory(silent).getStyle("hotel", "blue", 32);
    const marker = new Marker(1, 2, "x", style);

    expect(style.iconBitmap.byteLength).toBe(Sizes.iconBitmapBytes);
    expect(marker.style.iconBitmap).toBe(style.iconBitmap);
  });
});
