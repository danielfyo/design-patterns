using DesignPatterns.Iterator;

Console.WriteLine("=== Iterator Pattern: Paginated API results ===");

static void Print(Product p) => Console.WriteLine($"  #{p.Id} {p.Name,-10} ${p.Price:0.00}");

// 1) The classic GoF iterator: the client only knows HasNext()/Next().
Console.WriteLine("1) Explicit iterator: hasNext() / next()");
var api = new ProductApi();
var iterator = new ProductCatalog(api, pageSize: 3).CreateIterator();
var count = 0;
while (iterator.HasNext())
{
    Print(iterator.Next());
    count++;
}
Console.WriteLine($"Done: {count} products, {api.RequestCount} requests");

// 2) The idiomatic form: foreach over IEnumerable<T>. Because the iteration is
//    lazy, stopping early (Take) means the last page is never requested.
Console.WriteLine("2) Idiomatic loop, stopping after 4 products");
api = new ProductApi();
count = 0;
foreach (var product in new ProductCatalog(api, pageSize: 3).Take(4))
{
    Print(product);
    count++;
}
Console.WriteLine($"Done: {count} products, {api.RequestCount} requests (page 3 was never fetched)");
