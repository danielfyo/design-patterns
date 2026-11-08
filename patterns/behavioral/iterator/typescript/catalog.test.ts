import { describe, expect, it } from "vitest";
import {
  ProductApi,
  ProductCatalog,
  money,
  type ProductIterator,
} from "./catalog.ts";

const quietApi = (): { api: ProductApi; log: string[] } => {
  const log: string[] = [];
  return { api: new ProductApi((line) => log.push(line)), log };
};

const drain = (iterator: ProductIterator): number[] => {
  const ids: number[] = [];
  while (iterator.hasNext()) ids.push(iterator.next().id);
  return ids;
};

describe("Iterator: paginated product catalog", () => {
  it("walks every product in order across pages with the explicit iterator", () => {
    const { api } = quietApi();

    const ids = drain(new ProductCatalog(api, 3).createIterator());

    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(api.requestCount).toBe(3);
  });

  it("fetches pages lazily and only once per page", () => {
    const { api } = quietApi();
    const iterator = new ProductCatalog(api, 3).createIterator();
    expect(api.requestCount).toBe(0);

    iterator.hasNext();
    iterator.hasNext();
    expect(api.requestCount).toBe(1);

    for (let i = 0; i < 3; i++) iterator.next();
    expect(api.requestCount).toBe(1);

    iterator.next();
    expect(api.requestCount).toBe(2);
  });

  it("throws when next() is called past the end", () => {
    const iterator = new ProductCatalog(quietApi().api, 3).createIterator();
    drain(iterator);

    expect(iterator.hasNext()).toBe(false);
    expect(() => iterator.next()).toThrow("No more products.");
  });

  it("gives every iterator its own position", () => {
    const catalog = new ProductCatalog(quietApi().api, 3);
    const first = catalog.createIterator();
    const second = catalog.createIterator();

    first.next();
    first.next();

    expect(first.next().id).toBe(3);
    expect(second.next().id).toBe(1);
  });

  it.each([
    [1, 7],
    [3, 3],
    [7, 1],
    [10, 1],
  ])(
    "with page size %i needs %i requests for a full walk",
    (pageSize, requests) => {
      const { api } = quietApi();

      const ids = drain(new ProductCatalog(api, pageSize).createIterator());

      expect(ids).toHaveLength(7);
      expect(api.requestCount).toBe(requests);
    },
  );

  it("yields the same products through the iterable protocol", () => {
    const names = [...new ProductCatalog(quietApi().api, 3)].map((p) => p.name);

    expect(names).toEqual([
      "Keyboard",
      "Mouse",
      "Monitor",
      "Webcam",
      "Headset",
      "USB hub",
      "Desk lamp",
    ]);
  });

  it("never fetches the remaining pages when the loop stops early", () => {
    const { api, log } = quietApi();
    let count = 0;

    for (const _product of new ProductCatalog(api, 3)) {
      if (++count === 4) break;
    }

    expect(api.requestCount).toBe(2);
    expect(log).toEqual(["[api] fetching page 1", "[api] fetching page 2"]);
  });

  it("does nothing until the generator is pulled", () => {
    const { api } = quietApi();

    const iterator = new ProductCatalog(api, 3)[Symbol.iterator]();
    expect(api.requestCount).toBe(0);

    expect(iterator.next().value?.id).toBe(1);
    expect(api.requestCount).toBe(1);
  });

  it("formats prices with two decimals", () => {
    expect(money(189)).toBe("$189.00");
  });
});
