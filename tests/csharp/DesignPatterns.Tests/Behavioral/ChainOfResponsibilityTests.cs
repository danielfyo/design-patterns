using DesignPatterns.ChainOfResponsibility;

namespace DesignPatterns.Tests.Behavioral;

[Collection("Console")]
public sealed class ChainOfResponsibilityTests
{
    private static readonly Dictionary<string, string> Tokens = new()
    {
        ["token-alice"] = "alice",
        ["token-bob"] = "bob",
    };

    private static AuthenticationHandler BuildPipeline(int limit = 2)
    {
        var head = new AuthenticationHandler(Tokens);
        head.SetNext(new RateLimitHandler(limit))
            .SetNext(new ValidationHandler())
            .SetNext(new OrderController());
        return head;
    }

    private static Request Order(string? token = "token-alice", string ip = "10.0.0.1",
        string body = "2x coffee", string path = "/orders") => new("POST", path, token, ip, body);

    /// <summary>A handler that records whether the request ever reached it.</summary>
    private sealed class Probe : BaseHandler
    {
        public int Calls { get; private set; }

        public override Response Handle(Request request)
        {
            Calls++;
            return new Response(200, "probe");
        }
    }

    [Fact]
    public void A_valid_request_travels_the_whole_chain_and_reaches_the_controller()
    {
        using var console = new ConsoleCapture();

        var response = BuildPipeline().Handle(Order());

        Assert.Equal(new Response(200, "Order accepted for alice: 2x coffee"), response);
        Assert.Equal(
            "  [Authentication] ok, user=alice\n  [RateLimit] 10.0.0.1 request 1/2\n" +
            "  [Validation] ok\n  [OrderController] order accepted\n",
            console.Output);
    }

    [Theory]
    [InlineData(null, "Missing token")]
    [InlineData("forged-token", "Invalid token")]
    public void Authentication_short_circuits_without_calling_the_next_handler(string? token, string message)
    {
        using var console = new ConsoleCapture();
        var probe = new Probe();
        var auth = new AuthenticationHandler(Tokens);
        auth.SetNext(probe);

        var response = auth.Handle(Order(token));

        Assert.Equal(new Response(401, message), response);
        Assert.Equal(0, probe.Calls);
    }

    [Fact]
    public void Authentication_sets_the_user_for_later_handlers()
    {
        using var console = new ConsoleCapture();
        var request = Order(token: "token-bob");
        var auth = new AuthenticationHandler(Tokens);
        auth.SetNext(new Probe());

        auth.Handle(request);

        Assert.Equal("bob", request.User);
    }

    [Fact]
    public void Rate_limit_counts_per_ip_and_rejects_once_the_limit_is_exceeded()
    {
        using var console = new ConsoleCapture();
        var probe = new Probe();
        var limiter = new RateLimitHandler(2);
        limiter.SetNext(probe);

        int[] statuses =
        [
            limiter.Handle(Order(ip: "10.0.0.1")).Status,
            limiter.Handle(Order(ip: "10.0.0.1")).Status,
            limiter.Handle(Order(ip: "10.0.0.1")).Status,
            limiter.Handle(Order(ip: "10.0.0.2")).Status,
        ];

        Assert.Equal([200, 200, 429, 200], statuses);
        Assert.Equal(3, probe.Calls);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validation_rejects_an_empty_body(string body)
    {
        using var console = new ConsoleCapture();

        var response = BuildPipeline().Handle(Order(body: body));

        Assert.Equal(new Response(400, "Body must not be empty"), response);
        Assert.DoesNotContain("[OrderController]", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void A_request_nobody_handles_falls_off_the_end_of_the_chain_with_404()
    {
        using var console = new ConsoleCapture();

        var response = BuildPipeline().Handle(Order(path: "/invoices"));

        Assert.Equal(new Response(404, "No handler for /invoices"), response);
        Assert.Contains("[OrderController] not my route, passing on", console.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void SetNext_returns_the_handler_it_receives_for_fluent_chaining()
    {
        var head = new ValidationHandler();
        var next = new OrderController();

        Assert.Same(next, head.SetNext(next));
    }

    [Theory]
    [InlineData(200, "200 OK - done")]
    [InlineData(429, "429 Too Many Requests - done")]
    [InlineData(418, "418 Unknown - done")]
    public void Response_formats_status_reason_and_message(int status, string expected)
    {
        Assert.Equal(expected, new Response(status, "done").ToString());
    }
}
