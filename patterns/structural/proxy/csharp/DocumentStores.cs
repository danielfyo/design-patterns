namespace DesignPatterns.Proxy;

public sealed record User(string Name, string Role);

public sealed record Document(string Id, string Title, string Classification);

/// <summary>Raised by the protection proxy when a user may not read a document.</summary>
public sealed class AccessDeniedException(string message) : Exception(message);

/// <summary>
/// The Subject interface: shared by the real store and the proxy, so clients
/// cannot tell (and do not care) which one they are talking to.
/// </summary>
public interface IDocumentStore
{
    Document GetDocument(string id, User user);
}

/// <summary>
/// The Real Subject: a remote document server. Expensive to create (it opens
/// a connection) and every call is a network round trip. It trusts its caller
/// and performs no authorization of its own.
/// </summary>
public sealed class RemoteDocumentStore : IDocumentStore
{
    private static readonly Dictionary<string, Document> Documents = new()
    {
        ["doc-1"] = new Document("doc-1", "Q3 roadmap", "public"),
        ["doc-2"] = new Document("doc-2", "Merger plan", "confidential"),
    };

    public RemoteDocumentStore() => Console.WriteLine("[remote] connecting to document server...");

    public Document GetDocument(string id, User user)
    {
        Console.WriteLine($"[remote] fetching {id}");
        return Documents[id];
    }
}

/// <summary>
/// The Proxy: same interface as the real store, but it controls access to it.
/// It combines three kinds of proxy:
/// virtual (creates the real store lazily, on first use),
/// caching (remembers fetched documents), and
/// protection (viewers may not read confidential documents).
/// </summary>
public sealed class DocumentStoreProxy : IDocumentStore
{
    private readonly Lazy<RemoteDocumentStore> _real = new(() =>
    {
        Console.WriteLine("[proxy] creating the real store on first use");
        return new RemoteDocumentStore();
    });

    private readonly Dictionary<string, Document> _cache = [];

    public int Requests { get; private set; }
    public int RemoteFetches { get; private set; }
    public bool IsRealStoreCreated => _real.IsValueCreated;

    public Document GetDocument(string id, User user)
    {
        Requests++;

        // Caching proxy (+ virtual proxy: _real.Value creates the store only when needed).
        if (_cache.TryGetValue(id, out var document))
        {
            Console.WriteLine($"[proxy] cache hit {id}");
        }
        else
        {
            Console.WriteLine($"[proxy] cache miss {id}");
            document = _real.Value.GetDocument(id, user);
            RemoteFetches++;
            _cache[id] = document;
        }

        // Protection proxy: authorize every request, cached or not.
        if (user.Role == "viewer" && document.Classification == "confidential")
        {
            throw new AccessDeniedException($"{user.Role} cannot read confidential {id}");
        }
        return document;
    }
}
