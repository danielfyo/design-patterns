using DesignPatterns.Iterator;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class IteratorTests
{
    private static List<int> Drain(IProductIterator iterator)
    {
        var ids = new List<int>();
        while (iterator.HasNext())
        {
            ids.Add(iterator.Next().Id);
        }
        return ids;
    }

    [Fact]
    public void Explicit_iterator_walks_every_product_in_order_across_pages()
    {
        using var console = new ConsoleCapture();
        var api = new ProductApi();

        var ids = Drain(new ProductCatalog(api, pageSize: 3).CreateIterator());

        Assert.Equal([1, 2, 3, 4, 5, 6, 7], ids);
        Assert.Equal(3, api.RequestCount);
    }

    [Fact]
    public void Explicit_iterator_fetches_pages_lazily_and_only_once()
    {
        using var console = new ConsoleCapture();
        var api = new ProductApi();
        var iterator = new ProductCatalog(api, pageSize: 3).CreateIterator();
        Assert.Equal(0, api.RequestCount);

        Assert.True(iterator.HasNext());
        Assert.True(iterator.HasNext());
        Assert.Equal(1, api.RequestCount);

        for (var i = 0; i < 3; i++)
        {
            iterator.Next();
        }
        Assert.Equal(1, api.RequestCount);

        iterator.Next();
        Assert.Equal(2, api.RequestCount);
    }

    [Fact]
    public void Next_past_the_end_throws()
    {
        using var console = new ConsoleCapture();
        var iterator = new ProductCatalog(new ProductApi(), pageSize: 3).CreateIterator();
        Drain(iterator);

        Assert.False(iterator.HasNext());
        Assert.Throws<InvalidOperationException>(() => iterator.Next());
    }

    [Fact]
    public void Each_iterator_keeps_its_own_position()
    {
        using var console = new ConsoleCapture();
        var catalog = new ProductCatalog(new ProductApi(), pageSize: 3);
        var first = catalog.CreateIterator();
        var second = catalog.CreateIterator();

        first.Next();
        first.Next();

        Assert.Equal(3, first.Next().Id);
        Assert.Equal(1, second.Next().Id);
    }

    [Theory]
    [InlineData(1, 7)]
    [InlineData(3, 3)]
    [InlineData(7, 1)]
    [InlineData(10, 1)]
    public void Page_size_decides_how_many_requests_a_full_walk_needs(int pageSize, int requests)
    {
        using var console = new ConsoleCapture();
        var api = new ProductApi();

        var ids = Drain(new ProductCatalog(api, pageSize).CreateIterator());

        Assert.Equal(7, ids.Count);
        Assert.Equal(requests, api.RequestCount);
    }

    [Fact]
    public void Enumerable_form_yields_the_same_products()
    {
        using var console = new ConsoleCapture();

        var names = new ProductCatalog(new ProductApi(), pageSize: 3).Select(p => p.Name).ToList();

        Assert.Equal(["Keyboard", "Mouse", "Monitor", "Webcam", "Headset", "USB hub", "Desk lamp"], names);
    }

    [Fact]
    public void Stopping_early_never_fetches_the_remaining_pages()
    {
        using var console = new ConsoleCapture();
        var api = new ProductApi();

        var firstFour = new ProductCatalog(api, pageSize: 3).Take(4).ToList();

        Assert.Equal(4, firstFour.Count);
        Assert.Equal(2, api.RequestCount);
        Assert.Equal("[api] fetching page 1\n[api] fetching page 2\n", console.Output);
    }

    [Fact]
    public void Enumerable_does_nothing_until_it_is_enumerated()
    {
        using var console = new ConsoleCapture();
        var api = new ProductApi();

        var query = new ProductCatalog(api, pageSize: 3).Where(p => p.Price > 50m);
        Assert.Equal(0, api.RequestCount);

        Assert.Equal(3, query.First().Id);
        Assert.Equal(1, api.RequestCount);
    }
}
