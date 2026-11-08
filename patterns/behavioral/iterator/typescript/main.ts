// Run with: npx tsx patterns/behavioral/iterator/typescript/main.ts
import { ProductApi, ProductCatalog, money, type Product } from "./catalog.ts";

console.log("=== Iterator Pattern: Paginated API results ===");

const print = (p: Product): void => console.log(`  #${p.id} ${p.name.padEnd(10)} ${money(p.price)}`);

// 1) The classic GoF iterator: the client only knows hasNext()/next().
console.log("1) Explicit iterator: hasNext() / next()");
let api = new ProductApi();
const iterator = new ProductCatalog(api, 3).createIterator();
let count = 0;
while (iterator.hasNext()) {
  print(iterator.next());
  count++;
}
console.log(`Done: ${count} products, ${api.requestCount} requests`);

// 2) The idiomatic form: for...of over an iterable. Because the generator is
//    lazy, breaking out of the loop means the last page is never requested.
console.log("2) Idiomatic loop, stopping after 4 products");
api = new ProductApi();
count = 0;
for (const product of new ProductCatalog(api, 3)) {
  print(product);
  if (++count === 4) break;
}
console.log(`Done: ${count} products, ${api.requestCount} requests (page 3 was never fetched)`);
