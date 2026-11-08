using DesignPatterns.ChainOfResponsibility;

Console.WriteLine("=== Chain of Responsibility Pattern: HTTP request middleware pipeline ===");

var tokens = new Dictionary<string, string>
{
    ["token-alice"] = "alice",
    ["token-bob"] = "bob",
};

// Build the chain fluently: each SetNext returns the handler it was given.
var pipeline = new AuthenticationHandler(tokens);
pipeline
    .SetNext(new RateLimitHandler(2))
    .SetNext(new ValidationHandler())
    .SetNext(new OrderController());
Console.WriteLine("Pipeline: Authentication -> RateLimit(2 per IP) -> Validation -> OrderController");

Request[] requests =
[
    new("POST", "/orders", "token-alice", "10.0.0.1", "2x coffee"),
    new("POST", "/orders", null, "10.0.0.2", "1x tea"),
    new("POST", "/orders", "forged-token", "10.0.0.2", "1x tea"),
    new("POST", "/orders", "token-alice", "10.0.0.1", ""),
    new("POST", "/orders", "token-alice", "10.0.0.1", "1x tea"),
    new("POST", "/orders", "token-bob", "10.0.0.3", "3x muffin"),
    new("POST", "/invoices", "token-bob", "10.0.0.3", "invoice #42"),
];

for (var i = 0; i < requests.Length; i++)
{
    var r = requests[i];
    Console.WriteLine($"Request {i + 1}: {r.Method} {r.Path} ip={r.Ip} token={r.Token ?? "(none)"} body=\"{r.Body}\"");
    // The client only knows the head of the chain.
    var response = pipeline.Handle(r);
    Console.WriteLine($"  => {response}");
}
