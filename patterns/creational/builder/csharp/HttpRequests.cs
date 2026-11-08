using System.Collections.Immutable;
using System.Text;

namespace DesignPatterns.Builder;

/// <summary>
/// Product: an immutable HTTP request. It has many optional parts, which is exactly
/// why constructing it directly (a constructor with six parameters) is painful.
/// Only <see cref="HttpRequestBuilder"/> can create one (internal constructor).
/// </summary>
public sealed class HttpRequest
{
    internal HttpRequest(
        string method,
        string url,
        ImmutableSortedDictionary<string, string> headers,
        ImmutableSortedDictionary<string, string> query,
        string? body,
        int timeoutSeconds)
    {
        Method = method;
        Url = url;
        Headers = headers;
        Query = query;
        Body = body;
        TimeoutSeconds = timeoutSeconds;
    }

    public string Method { get; }
    public string Url { get; }
    public ImmutableSortedDictionary<string, string> Headers { get; }
    public ImmutableSortedDictionary<string, string> Query { get; }
    public string? Body { get; }
    public int TimeoutSeconds { get; }

    /// <summary>Deterministic, human-readable rendering (keys are sorted ordinally).</summary>
    public override string ToString()
    {
        var sb = new StringBuilder($"{Method} {Url}");
        if (!Query.IsEmpty)
            sb.Append('?').Append(string.Join("&", Query.Select(kv => $"{kv.Key}={kv.Value}")));
        foreach (var (name, value) in Headers)
            sb.Append($"\n  {name}: {value}");
        sb.Append($"\n  timeout: {TimeoutSeconds}s");
        sb.Append($"\n  body: {Body ?? "(none)"}");
        return sb.ToString();
    }
}

/// <summary>
/// Builder: collects the parts step by step through a fluent interface, then
/// validates everything at once in <see cref="Build"/> and returns the product.
/// (With a single product type, the builder is its own Concrete Builder.)
/// </summary>
public sealed class HttpRequestBuilder
{
    private string _method = "GET";
    private string? _url;
    private readonly SortedDictionary<string, string> _headers = new(StringComparer.Ordinal);
    private readonly SortedDictionary<string, string> _query = new(StringComparer.Ordinal);
    private string? _body;
    private int _timeoutSeconds = 30;

    public HttpRequestBuilder Method(string method) { _method = method.ToUpperInvariant(); return this; }
    public HttpRequestBuilder Url(string url) { _url = url; return this; }
    public HttpRequestBuilder Header(string name, string value) { _headers[name] = value; return this; }
    public HttpRequestBuilder Query(string name, string value) { _query[name] = value; return this; }
    public HttpRequestBuilder Body(string body) { _body = body; return this; }
    public HttpRequestBuilder Timeout(int seconds) { _timeoutSeconds = seconds; return this; }

    /// <summary>Validates the combination of parts and creates an immutable snapshot.</summary>
    public HttpRequest Build()
    {
        if (string.IsNullOrEmpty(_url))
            throw new InvalidOperationException("url is required");
        if (_body is not null && _method is "GET" or "HEAD")
            throw new InvalidOperationException($"{_method} requests cannot have a body");
        if (_timeoutSeconds <= 0)
            throw new InvalidOperationException("timeout must be positive");

        return new HttpRequest(
            _method,
            _url,
            _headers.ToImmutableSortedDictionary(StringComparer.Ordinal),
            _query.ToImmutableSortedDictionary(StringComparer.Ordinal),
            _body,
            _timeoutSeconds);
    }
}

/// <summary>
/// Director: knows the recipes for common requests. Each preset drives the builder
/// through a fixed sequence of steps and hands it back, so the caller can still add
/// steps before calling <c>Build()</c>.
/// </summary>
public static class RequestDirector
{
    public static HttpRequestBuilder JsonPost(string url, string body) =>
        new HttpRequestBuilder()
            .Method("POST")
            .Url(url)
            .Header("Accept", "application/json")
            .Header("Content-Type", "application/json")
            .Body(body);

    public static HttpRequestBuilder AuthenticatedGet(string url, string token) =>
        new HttpRequestBuilder()
            .Method("GET")
            .Url(url)
            .Header("Authorization", $"Bearer {token}")
            .Header("Accept", "application/json");
}
