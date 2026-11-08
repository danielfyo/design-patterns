using DesignPatterns.Interpreter;

Console.WriteLine("=== Interpreter Pattern: Pricing rule expression language ===");

(string Name, Context Context)[] contexts =
[
    ("regular", new Context(new Dictionary<string, double>
    {
        ["price"] = 20, ["quantity"] = 3, ["discount"] = 5, ["shipping"] = 6, ["taxRate"] = 0.21,
    })),
    ("bulk", new Context(new Dictionary<string, double>
    {
        ["price"] = 12.5, ["quantity"] = 10, ["discount"] = 15, ["shipping"] = 8, ["taxRate"] = 0.1,
    })),
];

foreach (var (name, context) in contexts)
{
    var vars = string.Join(", ", context.Variables.Select(v => $"{v.Key}={NumberLiteral.Format(v.Value)}"));
    Console.WriteLine($"Context {name + ":",-9}{vars}");
}

// Evaluate one AST against every context. The tree is built once and reused.
void Evaluate(IExpression ast)
{
    Console.WriteLine($"  {"AST:",-9}{ast}");
    foreach (var (name, context) in contexts)
    {
        string result;
        try { result = ast.Interpret(context).ToString("0.00"); }
        catch (ExpressionException e) { result = $"error: {e.Message}"; }
        Console.WriteLine($"  {name + ":",-9}{result}");
    }
}

// The AST classes ARE the pattern: we can build a sentence by hand, no parser needed.
Console.WriteLine("Hand-built AST (no parser): price * 0.9");
Evaluate(new Multiply(new Variable("price"), new NumberLiteral(0.9)));

string[] rules =
[
    "price * quantity - discount",
    "(price + shipping) * (1 + taxRate)",
    "price * quantity - discount - shipping / 2",
    "price * coupon",
    "(price + 1",
];

foreach (var rule in rules)
{
    Console.WriteLine($"Rule: {rule}");
    try
    {
        Evaluate(Parser.Parse(rule));
    }
    catch (ExpressionException e)
    {
        Console.WriteLine($"  syntax error: {e.Message}");
    }
}
