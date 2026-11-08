namespace DesignPatterns.ChainOfResponsibility;

/// <summary>
/// The request that travels along the chain. <see cref="User"/> is filled in by
/// the authentication handler so that later handlers can use it.
/// </summary>
public sealed class Request(string method, string path, string? token, string ip, string body)
{
    public string Method { get; } = method;
    public string Path { get; } = path;
    public string? Token { get; } = token;
    public string Ip { get; } = ip;
    public string Body { get; } = body;
    public string? User { get; set; }
}

/// <summary>The result produced by whichever handler ends the chain.</summary>
public sealed record Response(int Status, string Message)
{
    public string Reason => Status switch
    {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        429 => "Too Many Requests",
        _ => "Unknown",
    };

    public override string ToString() => $"{Status} {Reason} - {Message}";
}

/// <summary>
/// Handler: the common interface of every link in the chain.
/// <see cref="SetNext"/> returns the handler it receives so chains can be built fluently.
/// </summary>
public interface IHandler
{
    IHandler SetNext(IHandler next);
    Response Handle(Request request);
}

/// <summary>
/// Base Handler: stores the successor and, by default, forwards the request to it.
/// If nobody handled the request by the end of the chain, it answers 404.
/// </summary>
public abstract class BaseHandler : IHandler
{
    private IHandler? _next;

    public IHandler SetNext(IHandler next)
    {
        _next = next;
        return next;
    }

    public virtual Response Handle(Request request) =>
        _next?.Handle(request) ?? new Response(404, $"No handler for {request.Path}");
}

/// <summary>Concrete Handler: rejects requests without a known token (401).</summary>
public sealed class AuthenticationHandler(IReadOnlyDictionary<string, string> tokens) : BaseHandler
{
    public override Response Handle(Request request)
    {
        if (request.Token is null)
        {
            Console.WriteLine("  [Authentication] rejected: missing token");
            return new Response(401, "Missing token");
        }
        if (!tokens.TryGetValue(request.Token, out var user))
        {
            Console.WriteLine("  [Authentication] rejected: invalid token");
            return new Response(401, "Invalid token");
        }
        request.User = user;
        Console.WriteLine($"  [Authentication] ok, user={user}");
        return base.Handle(request);
    }
}

/// <summary>
/// Concrete Handler: allows at most <c>limit</c> requests per IP (429 afterwards).
/// The in-memory counter keeps the demo deterministic (no clock, no time window).
/// </summary>
public sealed class RateLimitHandler(int limit) : BaseHandler
{
    private readonly Dictionary<string, int> _counts = [];

    public override Response Handle(Request request)
    {
        var count = _counts.GetValueOrDefault(request.Ip) + 1;
        _counts[request.Ip] = count;
        if (count > limit)
        {
            Console.WriteLine($"  [RateLimit] rejected: {request.Ip} exceeded {limit} requests");
            return new Response(429, "Rate limit exceeded");
        }
        Console.WriteLine($"  [RateLimit] {request.Ip} request {count}/{limit}");
        return base.Handle(request);
    }
}

/// <summary>Concrete Handler: rejects requests with an empty body (400).</summary>
public sealed class ValidationHandler : BaseHandler
{
    public override Response Handle(Request request)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
        {
            Console.WriteLine("  [Validation] rejected: empty body");
            return new Response(400, "Body must not be empty");
        }
        Console.WriteLine("  [Validation] ok");
        return base.Handle(request);
    }
}

/// <summary>
/// Concrete Handler at the end of the chain: the endpoint. It handles only its
/// own route and passes anything else on (which ends in the base 404).
/// </summary>
public sealed class OrderController : BaseHandler
{
    public override Response Handle(Request request)
    {
        if (request.Path != "/orders")
        {
            Console.WriteLine("  [OrderController] not my route, passing on");
            return base.Handle(request);
        }
        Console.WriteLine("  [OrderController] order accepted");
        return new Response(200, $"Order accepted for {request.User}: {request.Body}");
    }
}
