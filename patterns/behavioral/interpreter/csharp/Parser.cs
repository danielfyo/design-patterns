using System.Globalization;

namespace DesignPatterns.Interpreter;

/// <summary>The kinds of token the tokenizer produces.</summary>
public enum TokenKind { Number, Identifier, Symbol, End }

/// <summary>A token and the position where it starts (for error messages).</summary>
public sealed record Token(TokenKind Kind, string Text, int Position)
{
    public string Describe() => Kind == TokenKind.End ? "end of input" : $"'{Text}'";
}

/// <summary>
/// Helper (not part of the pattern itself): a recursive-descent parser that
/// turns source text into an AST of <see cref="IExpression"/> objects.
/// Grammar, from lowest to highest precedence (all operators are left-associative):
/// <code>
/// expression := term (('+' | '-') term)*
/// term       := factor (('*' | '/') factor)*
/// factor     := NUMBER | IDENTIFIER | '(' expression ')'
/// </code>
/// </summary>
public sealed class Parser
{
    private readonly List<Token> _tokens;
    private int _index;

    private Parser(List<Token> tokens) => _tokens = tokens;

    public static IExpression Parse(string source)
    {
        var parser = new Parser(Tokenize(source));
        var expression = parser.ParseExpression();
        if (parser.Peek.Kind != TokenKind.End)
            throw new ExpressionException($"expected end of input but found {parser.Peek.Describe()}");
        return expression;
    }

    private static List<Token> Tokenize(string source)
    {
        var tokens = new List<Token>();
        var i = 0;
        while (i < source.Length)
        {
            var c = source[i];
            if (char.IsWhiteSpace(c)) { i++; continue; }
            var start = i;
            if (char.IsAsciiDigit(c) || c == '.')
            {
                while (i < source.Length && (char.IsAsciiDigit(source[i]) || source[i] == '.')) i++;
                tokens.Add(new Token(TokenKind.Number, source[start..i], start));
            }
            else if (char.IsAsciiLetter(c) || c == '_')
            {
                while (i < source.Length && (char.IsAsciiLetterOrDigit(source[i]) || source[i] == '_')) i++;
                tokens.Add(new Token(TokenKind.Identifier, source[start..i], start));
            }
            else if ("+-*/()".Contains(c))
            {
                tokens.Add(new Token(TokenKind.Symbol, c.ToString(), start));
                i++;
            }
            else
            {
                throw new ExpressionException($"unexpected character '{c}' at position {start}");
            }
        }
        tokens.Add(new Token(TokenKind.End, "", source.Length));
        return tokens;
    }

    private Token Peek => _tokens[_index];

    private bool Accept(string symbol)
    {
        if (Peek.Kind != TokenKind.Symbol || Peek.Text != symbol) return false;
        _index++;
        return true;
    }

    // expression := term (('+' | '-') term)*   -- the loop makes it left-associative
    private IExpression ParseExpression()
    {
        var left = ParseTerm();
        while (true)
        {
            if (Accept("+")) left = new Add(left, ParseTerm());
            else if (Accept("-")) left = new Subtract(left, ParseTerm());
            else return left;
        }
    }

    // term := factor (('*' | '/') factor)*
    private IExpression ParseTerm()
    {
        var left = ParseFactor();
        while (true)
        {
            if (Accept("*")) left = new Multiply(left, ParseFactor());
            else if (Accept("/")) left = new Divide(left, ParseFactor());
            else return left;
        }
    }

    // factor := NUMBER | IDENTIFIER | '(' expression ')'
    private IExpression ParseFactor()
    {
        var token = Peek;
        switch (token.Kind)
        {
            case TokenKind.Number:
                _index++;
                if (!double.TryParse(token.Text, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value))
                    throw new ExpressionException($"invalid number '{token.Text}' at position {token.Position}");
                return new NumberLiteral(value);
            case TokenKind.Identifier:
                _index++;
                return new Variable(token.Text);
        }
        if (Accept("("))
        {
            var inner = ParseExpression();
            if (!Accept(")")) throw new ExpressionException($"expected ')' but found {Peek.Describe()}");
            return inner;
        }
        throw new ExpressionException($"expected a number, variable or '(' but found {token.Describe()}");
    }
}
