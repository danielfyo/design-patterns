/**
 * Flyweight pattern: thousands of map markers sharing a handful of heavy
 * style objects. Framework-agnostic core, reused by the console demo
 * (main.ts) and the React demo (FlyweightDemo.tsx).
 */

/** Where participants write their trace lines (console by default). */
export type Log = (line: string) => void;

/** Fixed byte sizes used for the (deterministic) memory estimate. */
export const Sizes = {
  /** The decoded icon bitmap: the heavy part of a style. */
  iconBitmapBytes: 20_000,
  /** Icon name, color, size and object header of a style. */
  styleFieldsBytes: 64,
  /** Latitude, longitude, label reference and style reference of a marker. */
  markerFieldsBytes: 40,
} as const;

/**
 * The Flyweight: intrinsic, immutable state shared by many markers (icon,
 * color, size and the heavy bitmap). Extrinsic state (position, label) is
 * passed in to `draw` instead of being stored here.
 */
export class MarkerStyle {
  /** Imagine a decoded PNG: this is why styles must be shared. */
  readonly iconBitmap = new Uint8Array(Sizes.iconBitmapBytes);

  constructor(
    readonly icon: string,
    readonly color: string,
    readonly sizePx: number,
  ) {}

  draw(lat: number, lng: number, label: string): string {
    return `draw ${this.icon} icon (${this.color}, ${this.sizePx}px) at (${lat.toFixed(4)}, ${lng.toFixed(4)}) label "${label}"`;
  }
}

/**
 * The Flyweight Factory: creates each distinct style once and hands out the
 * cached instance on every later request.
 */
export class MarkerStyleFactory {
  private readonly styles = new Map<string, MarkerStyle>();
  private requestCount = 0;

  constructor(private readonly log: Log = console.log) {}

  get requests(): number {
    return this.requestCount;
  }

  get count(): number {
    return this.styles.size;
  }

  getStyle(icon: string, color: string, sizePx: number): MarkerStyle {
    this.requestCount++;
    const key = `${icon}/${color}/${sizePx}px`;
    let style = this.styles.get(key);
    if (style === undefined) {
      style = new MarkerStyle(icon, color, sizePx);
      this.styles.set(key, style);
      this.log(`[factory] new style: ${key}`);
    }
    return style;
  }
}

/**
 * The Context: one per marker on the map. It stores only the extrinsic state
 * and a reference to the shared flyweight.
 */
export class Marker {
  constructor(
    readonly lat: number,
    readonly lng: number,
    readonly label: string,
    readonly style: MarkerStyle,
  ) {}

  draw(): string {
    return this.style.draw(this.lat, this.lng, this.label);
  }
}

/** The three style specs used by both demos. */
export const STYLE_SPECS: ReadonlyArray<readonly [icon: string, color: string, sizePx: number]> = [
  ["restaurant", "red", 32],
  ["hotel", "blue", 32],
  ["fuel", "green", 24],
];

/** Creates `count` markers on a deterministic grid, cycling through the style specs. */
export function createMarkers(count: number, factory: MarkerStyleFactory): Marker[] {
  const markers: Marker[] = [];
  for (let i = 0; i < count; i++) {
    const [icon, color, size] = STYLE_SPECS[i % STYLE_SPECS.length];
    const lat = 40 + (i % 100) / 100;
    const lng = -3 - Math.floor(i / 100) / 100;
    markers.push(new Marker(lat, lng, `Place ${i}`, factory.getStyle(icon, color, size)));
  }
  return markers;
}
