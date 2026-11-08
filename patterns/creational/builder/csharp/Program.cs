using DesignPatterns.Builder;

Console.WriteLine("=== Builder Pattern: HTTP request builder ===");

static void Show(HttpRequest request) =>
    Console.WriteLine("  " + request.ToString().Replace("\n", "\n  "));

Console.WriteLine("1) Step by step with the fluent builder:");
Show(new HttpRequestBuilder()
    .Url("https://api.example.com/users")
    .Header("X-Request-Id", "req-001")
    .Header("Accept", "application/json")
    .Query("sort", "name")
    .Query("page", "2")
    .Timeout(5)
    .Build());

Console.WriteLine("2) Director preset jsonPost(url, body):");
Show(RequestDirector.JsonPost("https://api.example.com/orders", "{\"sku\":\"A-42\",\"qty\":2}").Build());

Console.WriteLine("3) Preset authenticatedGet(url, token) + extra steps:");
Show(RequestDirector.AuthenticatedGet("https://api.example.com/me", "demo-token-123")
    .Query("lang", "en")
    .Query("fields", "name,email")
    .Timeout(10)
    .Build());

Console.WriteLine("4) build() validates before creating the product:");
(string Label, Func<HttpRequestBuilder> Make)[] invalid =
[
    ("no url", () => new HttpRequestBuilder().Method("GET")),
    ("GET with body", () => new HttpRequestBuilder().Url("https://api.example.com/users").Body("{}")),
    ("timeout 0", () => RequestDirector.JsonPost("https://api.example.com/orders", "{}").Timeout(0)),
];
foreach (var (label, make) in invalid)
{
    try
    {
        make().Build();
        Console.WriteLine($"  {label,-13} -> built");
    }
    catch (InvalidOperationException ex)
    {
        Console.WriteLine($"  {label,-13} -> error: {ex.Message}");
    }
}

Console.WriteLine("5) Built requests are immutable snapshots:");
var builder = RequestDirector.AuthenticatedGet("https://api.example.com/me", "demo-token-123");
var first = builder.Build();
var second = builder.Header("X-Debug", "true").Build();
Console.WriteLine($"  first has {first.Headers.Count} headers, second has {second.Headers.Count} headers");
