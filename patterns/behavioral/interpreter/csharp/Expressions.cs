using System.Globalization;

namespace DesignPatterns.Interpreter;

/// <summary>Raised for syntax errors (parser) and evaluation errors (interpreter).</summary>
public sealed class ExpressionException(string message) : Exception(message);

/// <summary>
/// Context: the global information the expressions are interpreted against —
/// here, the values of the variables.
/// </summary>
public sealed class Context(IReadOnlyDictionary<string, double> variables)
{
    public IReadOnlyDictionary<string, double> Variables { get; } = variables;

    public double Lookup(string name) =>
        Variables.TryGetValue(name, out var value)
            ? value
            : throw new ExpressionException($"unknown variable '{name}'");
}

/// <summary>
/// Abstract Expression: one class per grammar rule implements this interface.
/// Interpreting a sentence means calling <see cref="Interpret"/> on the root of its AST.
/// <see cref="object.ToString"/> prints the AST in a fully parenthesized canonical form.
/// </summary>
public interface IExpression
{
    double Interpret(Context context);
}

/// <summary>Terminal Expression: a numeric literal such as <c>2</c> or <c>0.9</c>.</summary>
public sealed record NumberLiteral(double Value) : IExpression
{
    public double Interpret(Context context) => Value;
    public override string ToString() => Format(Value);

    /// <summary>Shortest round-trip form: 2, 0.21, 12.5 (identical in every language of the repo).</summary>
    public static string Format(double value) => value.ToString(CultureInfo.InvariantCulture);
}

/// <summary>Terminal Expression: a variable resolved through the context.</summary>
public sealed record Variable(string Name) : IExpression
{
    public double Interpret(Context context) => context.Lookup(Name);
    public override string ToString() => Name;
}

/// <summary>
/// Shared shape of the Nonterminal Expressions: two sub-expressions and an operator symbol.
/// Each subclass interprets its children recursively and combines the results.
/// </summary>
public abstract record BinaryExpression(IExpression Left, IExpression Right, string Symbol) : IExpression
{
    public abstract double Interpret(Context context);
    public sealed override string ToString() => $"({Left} {Symbol} {Right})";
}

/// <summary>Nonterminal Expression: <c>left + right</c>.</summary>
public sealed record Add(IExpression Left, IExpression Right) : BinaryExpression(Left, Right, "+")
{
    public override double Interpret(Context context) => Left.Interpret(context) + Right.Interpret(context);
}

/// <summary>Nonterminal Expression: <c>left - right</c>.</summary>
public sealed record Subtract(IExpression Left, IExpression Right) : BinaryExpression(Left, Right, "-")
{
    public override double Interpret(Context context) => Left.Interpret(context) - Right.Interpret(context);
}

/// <summary>Nonterminal Expression: <c>left * right</c>.</summary>
public sealed record Multiply(IExpression Left, IExpression Right) : BinaryExpression(Left, Right, "*")
{
    public override double Interpret(Context context) => Left.Interpret(context) * Right.Interpret(context);
}

/// <summary>Nonterminal Expression: <c>left / right</c> (division by zero is an error).</summary>
public sealed record Divide(IExpression Left, IExpression Right) : BinaryExpression(Left, Right, "/")
{
    public override double Interpret(Context context)
    {
        var divisor = Right.Interpret(context);
        if (divisor == 0)
        {
            throw new ExpressionException("division by zero");
        }

        return Left.Interpret(context) / divisor;
    }
}
