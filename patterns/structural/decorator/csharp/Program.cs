using DesignPatterns.Decorator;

Console.WriteLine("=== Decorator Pattern: Data fetcher with cross-cutting concerns ===");

// Stack A: the cache sits outside the retry, so a cached URL never touches the network.
Console.WriteLine("Stack A: Logging -> Caching -> Retry(3) -> Http");
IDataFetcher stackA = new LoggingFetcher(
    new CachingFetcher(
        new RetryFetcher(new HttpFetcher(new Dictionary<string, int> { ["/users"] = 2 }), 3)));
Show(stackA, "/users");
Show(stackA, "/users");

// Stack B: same pieces, different order. Logging is inside the retry, so it sees every attempt.
Console.WriteLine();
Console.WriteLine("Stack B: Retry(3) -> Logging -> Http");
IDataFetcher stackB = new RetryFetcher(
    new LoggingFetcher(new HttpFetcher(new Dictionary<string, int> { ["/users"] = 2 })), 3);
Show(stackB, "/users");

// Stack C: retries are not magic. If the server keeps failing, the error reaches the client.
Console.WriteLine();
Console.WriteLine("Stack C: Retry(2) -> Http");
IDataFetcher stackC = new RetryFetcher(new HttpFetcher(new Dictionary<string, int> { ["/orders"] = 3 }), 2);
Show(stackC, "/orders");

static void Show(IDataFetcher fetcher, string url)
{
    try
    {
        Console.WriteLine($"result: {fetcher.Fetch(url)}");
    }
    catch (FetchException ex)
    {
        Console.WriteLine($"error: {ex.Message}");
    }
}
