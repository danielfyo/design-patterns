/**
 * Iterator pattern: walk a paginated API one product at a time.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (IteratorDemo.tsx).
 */

/** An item of the collection we iterate over. */
export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

/** One page of results, as a paginated REST API would return it. */
export interface Page {
  readonly items: readonly Product[];
  readonly hasMore: boolean;
}

const PRODUCTS: readonly Product[] = [
  { id: 1, name: "Keyboard", price: 49.99 },
  { id: 2, name: "Mouse", price: 19.99 },
  { id: 3, name: "Monitor", price: 189.0 },
  { id: 4, name: "Webcam", price: 59.5 },
  { id: 5, name: "Headset", price: 79.9 },
  { id: 6, name: "USB hub", price: 24.0 },
  { id: 7, name: "Desk lamp", price: 34.75 },
];

/**
 * A fake remote API that returns products page by page
 * (think `GET /products?page=2&size=3`).
 */
export class ProductApi {
  requestCount = 0;

  constructor(private readonly log: (line: string) => void = console.log) {}

  /** Returns page `pageNumber` (1-based). */
  getPage(pageNumber: number, pageSize: number): Page {
    this.requestCount++;
    this.log(`[api] fetching page ${pageNumber}`);
    const start = (pageNumber - 1) * pageSize;
    return {
      items: PRODUCTS.slice(start, start + pageSize),
      hasMore: start + pageSize < PRODUCTS.length,
    };
  }
}

/** The Iterator interface in its classic GoF shape. */
export interface ProductIterator {
  hasNext(): boolean;
  next(): Product;
}

/**
 * Concrete Iterator: walks the products one by one and fetches the next page
 * only when the current one is exhausted. Clients never see pages.
 */
export class PagedProductIterator implements ProductIterator {
  #buffer: readonly Product[] = [];
  #index = 0;
  #pageNumber = 0;
  #hasMore = true;

  constructor(
    private readonly api: ProductApi,
    private readonly pageSize: number,
  ) {}

  hasNext(): boolean {
    if (this.#index < this.#buffer.length) return true;
    if (!this.#hasMore) return false;

    const page = this.api.getPage(++this.#pageNumber, this.pageSize);
    this.#buffer = page.items;
    this.#hasMore = page.hasMore;
    this.#index = 0;
    return this.#buffer.length > 0;
  }

  next(): Product {
    if (!this.hasNext()) throw new Error("No more products.");
    return this.#buffer[this.#index++];
  }
}

/**
 * Aggregate: the collection that hands out iterators. It offers both the explicit
 * GoF iterator and the idiomatic JavaScript form (the iterable protocol).
 */
export class ProductCatalog implements Iterable<Product> {
  constructor(
    private readonly api: ProductApi,
    private readonly pageSize: number,
  ) {}

  /** Factory method for the explicit iterator. */
  createIterator(): ProductIterator {
    return new PagedProductIterator(this.api, this.pageSize);
  }

  /**
   * Idiomatic TypeScript: a generator method under `Symbol.iterator` makes the
   * catalog usable in `for...of`, spread, `Array.from`, destructuring...
   * The body runs lazily, one item per `next()` call.
   */
  *[Symbol.iterator](): Generator<Product, void, undefined> {
    for (let pageNumber = 1; ; pageNumber++) {
      const page = this.api.getPage(pageNumber, this.pageSize);
      yield* page.items;
      if (!page.hasMore) return;
    }
  }
}

export const money = (amount: number): string => `$${amount.toFixed(2)}`;
