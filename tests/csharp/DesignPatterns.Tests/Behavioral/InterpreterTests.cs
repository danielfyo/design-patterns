using DesignPatterns.Interpreter;

namespace DesignPatterns.Tests.Behavioral;

public sealed class InterpreterTests
{
    private static readonly Context Regular = new(new Dictionary<string, double>
    {
        ["price"] = 20, ["quantity"] = 3, ["discount"] = 5, ["shipping"] = 6, ["taxRate"] = 0.21,
    });

    [Fact]
    public void A_hand_built_ast_is_interpreted_without_a_parser()
    {
        var ast = new Multiply(new Variable("price"), new NumberLiteral(0.9));

        Assert.Equal(18.0, ast.Interpret(Regular), 9);
        Assert.Equal("(price * 0.9)", ast.ToString());
    }

    [Theory]
    [InlineData("1 + 2 * 3", "(1 + (2 * 3))", 7)]
    [InlineData("(1 + 2) * 3", "((1 + 2) * 3)", 9)]
    [InlineData("10 - 4 - 3", "((10 - 4) - 3)", 3)]
    [InlineData("24 / 4 / 2", "((24 / 4) / 2)", 3)]
    [InlineData("price * quantity - discount", "((price * quantity) - discount)", 55)]
    public void Parser_respects_precedence_and_left_associativity(string source, string ast, double value)
    {
        var expression = Parser.Parse(source);

        Assert.Equal(ast, expression.ToString());
        Assert.Equal(value, expression.Interpret(Regular), 9);
    }

    [Fact]
    public void The_same_ast_is_reinterpreted_against_different_contexts()
    {
        var ast = Parser.Parse("(price + shipping) * (1 + taxRate)");
        var bulk = new Context(new Dictionary<string, double>
        {
            ["price"] = 12.5, ["shipping"] = 8, ["taxRate"] = 0.1,
        });

        Assert.Equal(31.46, ast.Interpret(Regular), 9);
        Assert.Equal(22.55, ast.Interpret(bulk), 9);
    }

    [Fact]
    public void Unknown_variable_is_an_evaluation_error()
    {
        var ast = Parser.Parse("price * coupon");

        var error = Assert.Throws<ExpressionException>(() => ast.Interpret(Regular));
        Assert.Equal("unknown variable 'coupon'", error.Message);
    }

    [Fact]
    public void Division_by_zero_is_an_evaluation_error_checked_before_the_dividend()
    {
        var error = Assert.Throws<ExpressionException>(() => Parser.Parse("coupon / (quantity - 3)").Interpret(Regular));
        Assert.Equal("division by zero", error.Message);
    }

    [Theory]
    [InlineData("(price + 1", "expected ')' but found end of input")]
    [InlineData("price +", "expected a number, variable or '(' but found end of input")]
    [InlineData("price price", "expected end of input but found 'price'")]
    [InlineData("price % 2", "unexpected character '%' at position 6")]
    [InlineData("1.2.3", "invalid number '1.2.3' at position 0")]
    public void Syntax_errors_are_reported_with_a_clear_message(string source, string message)
    {
        var error = Assert.Throws<ExpressionException>(() => Parser.Parse(source));
        Assert.Equal(message, error.Message);
    }

    [Theory]
    [InlineData(2, "2")]
    [InlineData(0.21, "0.21")]
    [InlineData(12.5, "12.5")]
    public void Numbers_are_printed_in_their_shortest_form(double value, string expected)
    {
        Assert.Equal(expected, NumberLiteral.Format(value));
    }
}
