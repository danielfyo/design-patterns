namespace DesignPatterns.Decorator;

/// <summary>Raised when a (simulated) HTTP request fails.</summary>
public sealed class FetchException(string message) : Exception(message);

/// <summary>
/// The Component interface: anything that can fetch the body of a URL.
/// Clients and decorators depend only on this contract.
/// </summary>
public interface IDataFetcher
{
    string Fetch(string url);
}

/// <summary>
/// Concrete Component: an in-memory fake HTTP client. It returns canned bodies
/// and fails the first N calls for selected URLs, so retries are deterministic.
/// </summary>
public sealed class HttpFetcher(IReadOnlyDictionary<string, int> failFirst) : IDataFetcher
{
    private static readonly Dictionary<string, string> Responses = new()
    {
        ["/users"] = """{"users":["ada","linus"]}""",
        ["/orders"] = """{"orders":[101,102]}""",
    };

    private readonly Dictionary<string, int> _remainingFailures = new(failFirst);

    public string Fetch(string url)
    {
        Console.WriteLine($"[http] GET {url}");
        if (_remainingFailures.TryGetValue(url, out var left) && left > 0)
        {
            _remainingFailures[url] = left - 1;
            throw new FetchException("503 Service Unavailable");
        }
        return Responses.GetValueOrDefault(url, "{}");
    }
}

/// <summary>
/// Base Decorator: implements the component interface and forwards every call
/// to the wrapped component. Concrete decorators override what they need.
/// </summary>
public abstract class FetcherDecorator(IDataFetcher inner) : IDataFetcher
{
    protected IDataFetcher Inner { get; } = inner;

    public virtual string Fetch(string url) => Inner.Fetch(url);
}

/// <summary>Concrete Decorator: logs every call and its outcome.</summary>
public sealed class LoggingFetcher(IDataFetcher inner) : FetcherDecorator(inner)
{
    public override string Fetch(string url)
    {
        Console.WriteLine($"[log] fetch {url}");
        try
        {
            var body = base.Fetch(url);
            Console.WriteLine($"[log] ok {url} ({body.Length} chars)");
            return body;
        }
        catch (FetchException ex)
        {
            Console.WriteLine($"[log] error {url}: {ex.Message}");
            throw;
        }
    }
}

/// <summary>Concrete Decorator: remembers successful responses by URL.</summary>
public sealed class CachingFetcher(IDataFetcher inner) : FetcherDecorator(inner)
{
    private readonly Dictionary<string, string> _cache = [];

    public override string Fetch(string url)
    {
        if (_cache.TryGetValue(url, out var cached))
        {
            Console.WriteLine($"[cache] hit {url}");
            return cached;
        }
        Console.WriteLine($"[cache] miss {url}");
        var body = base.Fetch(url);
        _cache[url] = body;
        Console.WriteLine($"[cache] stored {url}");
        return body;
    }
}

/// <summary>Concrete Decorator: retries failed calls up to <c>maxAttempts</c> times.</summary>
public sealed class RetryFetcher(IDataFetcher inner, int maxAttempts) : FetcherDecorator(inner)
{
    public override string Fetch(string url)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return base.Fetch(url);
            }
            catch (FetchException ex)
            {
                var last = attempt >= maxAttempts;
                Console.WriteLine($"[retry] attempt {attempt}/{maxAttempts} failed: {ex.Message}, {(last ? "giving up" : "retrying")}");
                if (last)
                {
                    throw;
                }
            }
        }
    }
}
