"""Flyweight pattern: thousands of map markers sharing a handful of heavy styles.

Run with:  python3 main.py
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Fixed byte sizes used for the (deterministic) memory estimate.
ICON_BITMAP_BYTES = 20_000  # the decoded icon bitmap: the heavy part of a style
STYLE_FIELDS_BYTES = 64  # icon name, color, size and object header of a style
MARKER_FIELDS_BYTES = 40  # latitude, longitude, label reference and style reference


@dataclass(frozen=True)
class MarkerStyle:
    """The Flyweight: intrinsic, immutable state shared by many markers.

    Extrinsic state (position, label) is passed in to ``draw`` instead of
    being stored here.
    """

    icon: str
    color: str
    size_px: int
    # Imagine a decoded PNG: this is why styles must be shared.
    icon_bitmap: bytes = field(default_factory=lambda: bytes(ICON_BITMAP_BYTES), repr=False)

    def draw(self, lat: float, lng: float, label: str) -> str:
        return (
            f"draw {self.icon} icon ({self.color}, {self.size_px}px) "
            f'at ({lat:.4f}, {lng:.4f}) label "{label}"'
        )


class MarkerStyleFactory:
    """The Flyweight Factory: creates each distinct style once and caches it."""

    def __init__(self) -> None:
        self._styles: dict[tuple[str, str, int], MarkerStyle] = {}
        self.requests = 0

    @property
    def count(self) -> int:
        return len(self._styles)

    def get_style(self, icon: str, color: str, size_px: int) -> MarkerStyle:
        self.requests += 1
        key = (icon, color, size_px)
        style = self._styles.get(key)
        if style is None:
            style = MarkerStyle(icon, color, size_px)
            self._styles[key] = style
            print(f"[factory] new style: {icon}/{color}/{size_px}px")
        return style


@dataclass(frozen=True, slots=True)
class Marker:
    """The Context: stores only extrinsic state plus a reference to the shared flyweight."""

    lat: float
    lng: float
    label: str
    style: MarkerStyle

    def draw(self) -> str:
        return self.style.draw(self.lat, self.lng, self.label)


def main() -> None:
    print("=== Flyweight Pattern: Map markers ===")

    specs = [("restaurant", "red", 32), ("hotel", "blue", 32), ("fuel", "green", 24)]
    marker_count = 10_000
    factory = MarkerStyleFactory()
    markers: list[Marker] = []
    for i in range(marker_count):
        icon, color, size = specs[i % len(specs)]
        lat = 40 + (i % 100) / 100  # deterministic grid of positions
        lng = -3 - (i // 100) / 100
        markers.append(Marker(lat, lng, f"Place {i}", factory.get_style(icon, color, size)))

    print(f"Created {len(markers)} markers with {factory.requests} style requests")
    print(f"Style objects created: {factory.count}")

    # Memory estimate with fixed sizes, so every language prints the same numbers.
    icon_b, fields_b, marker_b = ICON_BITMAP_BYTES, STYLE_FIELDS_BYTES, MARKER_FIELDS_BYTES
    style_bytes = icon_b + fields_b
    without = marker_count * (style_bytes + marker_b)
    with_fw = marker_count * marker_b + factory.count * style_bytes
    print(f"Memory estimate (icon={icon_b} B, style fields={fields_b} B, marker fields={marker_b} B):")
    print(
        f"  without flyweight: {marker_count} x ({icon_b} + {fields_b} + {marker_b}) "
        f"= {without} B ({without / 1048576:.2f} MB)"
    )
    print(
        f"  with flyweight:    {marker_count} x {marker_b} + {factory.count} x ({icon_b} + {fields_b}) "
        f"= {with_fw} B ({with_fw / 1048576:.2f} MB)"
    )
    print(f"  saved: {(1 - with_fw / without) * 100:.2f}%")

    print("Rendering a few markers:")
    for index in (0, 1, 2, 3, 9999):
        print(f"  #{index}: {markers[index].draw()}")
    shared = markers[0].style is markers[3].style
    print(f"Markers #0 and #3 share one style object: {str(shared).lower()}")


if __name__ == "__main__":
    main()
