using DesignPatterns.Proxy;

namespace DesignPatterns.Tests.Structural;

[Collection("Console")]
public sealed class ProxyTests
{
    private static readonly User Editor = new("alice", "editor");
    private static readonly User Viewer = new("bob", "viewer");

    private static int Occurrences(string text, string fragment) =>
        text.Split('\n').Count(line => line.Contains(fragment, StringComparison.Ordinal));

    [Fact]
    public void Virtual_proxy_does_not_create_the_real_store_until_first_request()
    {
        using var console = new ConsoleCapture();

        var proxy = new DocumentStoreProxy();

        Assert.False(proxy.IsRealStoreCreated);
        Assert.Equal(string.Empty, console.Output);

        proxy.GetDocument("doc-1", Editor);

        Assert.True(proxy.IsRealStoreCreated);
    }

    [Fact]
    public void Real_store_is_created_only_once()
    {
        using var console = new ConsoleCapture();
        var proxy = new DocumentStoreProxy();

        proxy.GetDocument("doc-1", Editor);
        proxy.GetDocument("doc-2", Editor);

        Assert.Equal(1, Occurrences(console.Output, "[remote] connecting"));
    }

    [Fact]
    public void Caching_proxy_fetches_each_document_from_the_remote_store_once()
    {
        using var console = new ConsoleCapture();
        IDocumentStore store = new DocumentStoreProxy();

        var first = store.GetDocument("doc-1", Editor);
        var second = store.GetDocument("doc-1", Viewer);

        Assert.Same(first, second);
        Assert.Equal(1, Occurrences(console.Output, "[remote] fetching doc-1"));
        var proxy = (DocumentStoreProxy)store;
        Assert.Equal(2, proxy.Requests);
        Assert.Equal(1, proxy.RemoteFetches);
    }

    [Fact]
    public void Protection_proxy_denies_viewers_confidential_documents()
    {
        using var console = new ConsoleCapture();
        var proxy = new DocumentStoreProxy();

        var ex = Assert.Throws<AccessDeniedException>(() => proxy.GetDocument("doc-2", Viewer));

        Assert.Equal("viewer cannot read confidential doc-2", ex.Message);
    }

    [Fact]
    public void Protection_proxy_lets_editors_read_confidential_documents()
    {
        using var console = new ConsoleCapture();
        var proxy = new DocumentStoreProxy();

        var doc = proxy.GetDocument("doc-2", Editor);

        Assert.Equal(new Document("doc-2", "Merger plan", "confidential"), doc);
    }

    [Fact]
    public void Protection_is_checked_even_when_the_document_is_cached()
    {
        using var console = new ConsoleCapture();
        var proxy = new DocumentStoreProxy();
        proxy.GetDocument("doc-2", Editor);

        Assert.Throws<AccessDeniedException>(() => proxy.GetDocument("doc-2", Viewer));

        Assert.Equal(1, proxy.RemoteFetches);
        Assert.Equal(2, proxy.Requests);
    }

    [Fact]
    public void Denied_request_still_warms_the_cache()
    {
        using var console = new ConsoleCapture();
        var proxy = new DocumentStoreProxy();
        Assert.Throws<AccessDeniedException>(() => proxy.GetDocument("doc-2", Viewer));

        proxy.GetDocument("doc-2", Editor);

        Assert.Equal(1, proxy.RemoteFetches);
        Assert.Contains("[proxy] cache hit doc-2", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Real_subject_performs_no_authorization_of_its_own()
    {
        using var console = new ConsoleCapture();
        IDocumentStore real = new RemoteDocumentStore();

        var doc = real.GetDocument("doc-2", Viewer);

        Assert.Equal("confidential", doc.Classification);
    }
}
