using DesignPatterns.Decorator;

namespace DesignPatterns.Tests.Structural;

[Collection("Console")]
public sealed class DecoratorTests
{
    private const string UsersBody = """{"users":["ada","linus"]}""";

    private static Dictionary<string, int> FailFirst(string url, int times) => new() { [url] = times };

    private static int Occurrences(string text, string fragment) =>
        text.Split('\n').Count(line => line.StartsWith(fragment, StringComparison.Ordinal));

    /// <summary>A test double that counts how often the decorated component is reached.</summary>
    private sealed class CountingFetcher(IDataFetcher inner) : IDataFetcher
    {
        public int Calls { get; private set; }

        public string Fetch(string url)
        {
            Calls++;
            return inner.Fetch(url);
        }
    }

    [Fact]
    public void Http_fetcher_returns_canned_bodies_and_an_empty_object_for_unknown_urls()
    {
        using var console = new ConsoleCapture();
        var http = new HttpFetcher(new Dictionary<string, int>());

        Assert.Equal(UsersBody, http.Fetch("/users"));
        Assert.Equal("{}", http.Fetch("/unknown"));
    }

    [Fact]
    public void Retry_recovers_from_transient_failures()
    {
        using var console = new ConsoleCapture();
        IDataFetcher fetcher = new RetryFetcher(new HttpFetcher(FailFirst("/users", 2)), 3);

        Assert.Equal(UsersBody, fetcher.Fetch("/users"));
        Assert.Equal(3, Occurrences(console.Output, "[http] GET /users"));
    }

    [Fact]
    public void Retry_gives_up_after_max_attempts_and_rethrows()
    {
        using var console = new ConsoleCapture();
        IDataFetcher fetcher = new RetryFetcher(new HttpFetcher(FailFirst("/orders", 3)), 2);

        var ex = Assert.Throws<FetchException>(() => fetcher.Fetch("/orders"));

        Assert.Equal("503 Service Unavailable", ex.Message);
        Assert.Equal(2, Occurrences(console.Output, "[http] GET /orders"));
        Assert.Contains("attempt 2/2 failed: 503 Service Unavailable, giving up", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Caching_serves_repeated_requests_without_reaching_the_wrapped_component()
    {
        using var console = new ConsoleCapture();
        var counter = new CountingFetcher(new HttpFetcher(new Dictionary<string, int>()));
        IDataFetcher fetcher = new CachingFetcher(counter);

        var first = fetcher.Fetch("/users");
        var second = fetcher.Fetch("/users");

        Assert.Equal(first, second);
        Assert.Equal(1, counter.Calls);
        Assert.Contains("[cache] hit /users", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Caching_does_not_remember_failures()
    {
        using var console = new ConsoleCapture();
        IDataFetcher fetcher = new CachingFetcher(new HttpFetcher(FailFirst("/users", 1)));

        Assert.Throws<FetchException>(() => fetcher.Fetch("/users"));

        Assert.Equal(UsersBody, fetcher.Fetch("/users"));
        Assert.DoesNotContain("[cache] hit", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Logging_reports_the_error_and_rethrows_it_unchanged()
    {
        using var console = new ConsoleCapture();
        IDataFetcher fetcher = new LoggingFetcher(new HttpFetcher(FailFirst("/users", 1)));

        Assert.Throws<FetchException>(() => fetcher.Fetch("/users"));

        Assert.Contains("[log] error /users: 503 Service Unavailable", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void Decorator_order_matters_logging_outside_retry_sees_one_call()
    {
        using var console = new ConsoleCapture();
        IDataFetcher fetcher = new LoggingFetcher(new RetryFetcher(new HttpFetcher(FailFirst("/users", 2)), 3));

        fetcher.Fetch("/users");

        Assert.Equal(1, Occurrences(console.Output, "[log] fetch /users"));
        Assert.Equal(0, Occurrences(console.Output, "[log] error"));
    }

    [Fact]
    public void Decorator_order_matters_logging_inside_retry_sees_every_attempt()
    {
        using var console = new ConsoleCapture();
        IDataFetcher fetcher = new RetryFetcher(new LoggingFetcher(new HttpFetcher(FailFirst("/users", 2))), 3);

        fetcher.Fetch("/users");

        Assert.Equal(3, Occurrences(console.Output, "[log] fetch /users"));
        Assert.Equal(2, Occurrences(console.Output, "[log] error /users"));
    }

    [Fact]
    public void Cache_outside_retry_answers_the_second_call_without_any_http_request()
    {
        using var console = new ConsoleCapture();
        IDataFetcher fetcher = new CachingFetcher(new RetryFetcher(new HttpFetcher(FailFirst("/users", 2)), 3));
        fetcher.Fetch("/users");
        var httpCallsAfterFirst = Occurrences(console.Output, "[http] GET");

        Assert.Equal(UsersBody, fetcher.Fetch("/users"));

        Assert.Equal(httpCallsAfterFirst, Occurrences(console.Output, "[http] GET"));
    }
}
