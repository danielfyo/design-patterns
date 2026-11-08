import { useMemo, useState } from "react";
import { MarkerStyleFactory, Sizes, createMarkers } from "./markers.ts";

const WIDTH = 400;
const HEIGHT = 400;

/**
 * React usage: thousands of SVG markers, but only three style objects.
 * Each <circle> receives the shared flyweight (color, size) plus its own
 * extrinsic state (position, label). The factory is created once per
 * component, so styles survive re-renders and changes to the marker count.
 */
export default function FlyweightDemo() {
  const [count, setCount] = useState(1000);
  const factory = useMemo(() => new MarkerStyleFactory(() => {}), []);
  const markers = useMemo(() => createMarkers(count, factory), [count, factory]);

  const styleBytes = Sizes.iconBitmapBytes + Sizes.styleFieldsBytes;
  const without = count * (styleBytes + Sizes.markerFieldsBytes);
  const withFlyweight = count * Sizes.markerFieldsBytes + factory.count * styleBytes;

  return (
    <section>
      <h2>Flyweight — Map markers</h2>
      <label>
        Markers: {count}{" "}
        <input type="range" min={100} max={10000} step={100} value={count} onChange={(e) => setCount(Number(e.target.value))} />
      </label>
      <p>
        Style objects: <strong>{factory.count}</strong> · estimated memory{" "}
        <strong>{(withFlyweight / 1048576).toFixed(2)} MB</strong> instead of {(without / 1048576).toFixed(2)} MB
      </p>
      <svg width={WIDTH} height={HEIGHT} style={{ border: "1px solid #ccc", background: "#f8f8f8" }}>
        {markers.map((m) => (
          <circle
            key={m.label}
            cx={(m.lat - 40) * WIDTH}
            cy={(-3 - m.lng) * HEIGHT}
            r={m.style.sizePx / 16}
            fill={m.style.color}
          >
            <title>{`${m.label} (${m.style.icon})`}</title>
          </circle>
        ))}
      </svg>
    </section>
  );
}
