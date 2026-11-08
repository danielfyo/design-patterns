using System.Collections;

namespace DesignPatterns.Iterator;

/// <summary>An item of the collection we iterate over.</summary>
public sealed record Product(int Id, string Name, decimal Price);

/// <summary>One page of results, as a paginated REST API would return it.</summary>
public sealed record Page(IReadOnlyList<Product> Items, bool HasMore);

/// <summary>
/// A fake remote API that returns products page by page. It stands in for a real
/// HTTP endpoint such as <c>GET /products?page=2&amp;size=3</c>.
/// </summary>
public sealed class ProductApi
{
    private readonly Product[] _products =
    [
        new(1, "Keyboard", 49.99m),
        new(2, "Mouse", 19.99m),
        new(3, "Monitor", 189.00m),
        new(4, "Webcam", 59.50m),
        new(5, "Headset", 79.90m),
        new(6, "USB hub", 24.00m),
        new(7, "Desk lamp", 34.75m),
    ];

    public int RequestCount { get; private set; }

    /// <summary>Returns page <paramref name="pageNumber"/> (1-based).</summary>
    public Page GetPage(int pageNumber, int pageSize)
    {
        RequestCount++;
        Console.WriteLine($"[api] fetching page {pageNumber}");
        var items = _products.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToArray();
        return new Page(items, pageNumber * pageSize < _products.Length);
    }
}

/// <summary>The Iterator interface in its classic GoF shape.</summary>
public interface IProductIterator
{
    bool HasNext();
    Product Next();
}

/// <summary>
/// Concrete Iterator: walks the products one by one and fetches the next page
/// only when the current one is exhausted. Clients never see pages.
/// </summary>
public sealed class PagedProductIterator(ProductApi api, int pageSize) : IProductIterator
{
    private IReadOnlyList<Product> _buffer = [];
    private int _index;
    private int _pageNumber;
    private bool _hasMore = true;

    public bool HasNext()
    {
        if (_index < _buffer.Count) return true;
        if (!_hasMore) return false;

        var page = api.GetPage(++_pageNumber, pageSize);
        _buffer = page.Items;
        _hasMore = page.HasMore;
        _index = 0;
        return _buffer.Count > 0;
    }

    public Product Next() =>
        HasNext() ? _buffer[_index++] : throw new InvalidOperationException("No more products.");
}

/// <summary>
/// Aggregate: the collection that hands out iterators. It offers both the explicit
/// GoF iterator and the idiomatic .NET form (<see cref="IEnumerable{T}"/>).
/// </summary>
public sealed class ProductCatalog(ProductApi api, int pageSize) : IEnumerable<Product>
{
    /// <summary>Factory method for the explicit iterator.</summary>
    public IProductIterator CreateIterator() => new PagedProductIterator(api, pageSize);

    /// <summary>
    /// Idiomatic C#: <c>yield return</c> makes the compiler generate the iterator
    /// state machine for us. The code runs lazily, one item per MoveNext().
    /// </summary>
    public IEnumerator<Product> GetEnumerator()
    {
        var pageNumber = 1;
        while (true)
        {
            var page = api.GetPage(pageNumber++, pageSize);
            foreach (var product in page.Items)
                yield return product;
            if (!page.HasMore) yield break;
        }
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
