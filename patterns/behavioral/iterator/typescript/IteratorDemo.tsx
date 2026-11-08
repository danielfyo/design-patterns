import { useRef, useState } from "react";
import { ProductApi, ProductCatalog, money, type Product } from "./catalog.ts";

const BATCH = 2; // deliberately different from the API page size (3)

/**
 * React usage: the component keeps a live iterator in a ref and pulls BATCH
 * items per "Load more" click. It never deals with pages; the iterator fetches
 * them lazily (watch the request log) and tells us when it is exhausted.
 */
export default function IteratorDemo() {
  const [products, setProducts] = useState<Product[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const iteratorRef = useRef<Iterator<Product> | null>(null);

  const start = (): Iterator<Product> => {
    const api = new ProductApi((line) => setLog((l) => [...l, line]));
    return new ProductCatalog(api, 3)[Symbol.iterator]();
  };

  const loadMore = () => {
    iteratorRef.current ??= start();
    const batch: Product[] = [];
    while (batch.length < BATCH) {
      const result = iteratorRef.current.next();
      if (result.done) {
        setDone(true);
        break;
      }
      batch.push(result.value);
    }
    setProducts((p) => [...p, ...batch]);
  };

  const reset = () => {
    iteratorRef.current?.return?.(); // let the generator clean up
    iteratorRef.current = null;
    setProducts([]);
    setLog([]);
    setDone(false);
  };

  return (
    <section>
      <h2>Iterator — Paginated API results</h2>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            #{p.id} {p.name} — {money(p.price)}
          </li>
        ))}
      </ul>
      <button onClick={loadMore} disabled={done}>
        {done ? "No more products" : `Load ${BATCH} more`}
      </button>{" "}
      <button onClick={reset}>Reset</button>
      <p>
        <small>API log (page size 3):</small>
      </p>
      <pre style={{ background: "#f4f4f4", padding: 8, minHeight: 20 }}>{log.join("\n")}</pre>
    </section>
  );
}
