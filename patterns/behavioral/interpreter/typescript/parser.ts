/**
 * Helper (not part of the pattern itself): a recursive-descent parser that
 * turns source text into an AST of Expression objects.
 *
 * Grammar, from lowest to highest precedence (all operators are left-associative):
 *
 *   expression := term (('+' | '-') term)*
 *   term       := factor (('*' | '/') factor)*
 *   factor     := NUMBER | IDENTIFIER | '(' expression ')'
 */
import {
  Add,
  Divide,
  ExpressionError,
  Multiply,
  NumberLiteral,
  Subtract,
  Variable,
  type Expression,
} from "./expressions.ts";

type TokenKind = "number" | "identifier" | "symbol" | "end";

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly position: number;
}

const describe = (token: Token): string => (token.kind === "end" ? "end of input" : `'${token.text}'`);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const start = i;
    if (/[0-9.]/.test(c)) {
      while (i < source.length && /[0-9.]/.test(source[i])) i++;
      tokens.push({ kind: "number", text: source.slice(start, i), position: start });
    } else if (/[A-Za-z_]/.test(c)) {
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i++;
      tokens.push({ kind: "identifier", text: source.slice(start, i), position: start });
    } else if ("+-*/()".includes(c)) {
      tokens.push({ kind: "symbol", text: c, position: start });
      i++;
    } else {
      throw new ExpressionError(`unexpected character '${c}' at position ${start}`);
    }
  }
  tokens.push({ kind: "end", text: "", position: source.length });
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  private get peek(): Token {
    return this.tokens[this.index];
  }

  private accept(symbol: string): boolean {
    if (this.peek.kind !== "symbol" || this.peek.text !== symbol) return false;
    this.index++;
    return true;
  }

  parseAll(): Expression {
    const expression = this.parseExpression();
    if (this.peek.kind !== "end") {
      throw new ExpressionError(`expected end of input but found ${describe(this.peek)}`);
    }
    return expression;
  }

  // expression := term (('+' | '-') term)*   -- the loop makes it left-associative
  private parseExpression(): Expression {
    let left = this.parseTerm();
    for (;;) {
      if (this.accept("+")) left = new Add(left, this.parseTerm());
      else if (this.accept("-")) left = new Subtract(left, this.parseTerm());
      else return left;
    }
  }

  // term := factor (('*' | '/') factor)*
  private parseTerm(): Expression {
    let left = this.parseFactor();
    for (;;) {
      if (this.accept("*")) left = new Multiply(left, this.parseFactor());
      else if (this.accept("/")) left = new Divide(left, this.parseFactor());
      else return left;
    }
  }

  // factor := NUMBER | IDENTIFIER | '(' expression ')'
  private parseFactor(): Expression {
    const token = this.peek;
    if (token.kind === "number") {
      this.index++;
      if (!/^(\d+\.?\d*|\.\d+)$/.test(token.text)) {
        throw new ExpressionError(`invalid number '${token.text}' at position ${token.position}`);
      }
      return new NumberLiteral(Number(token.text));
    }
    if (token.kind === "identifier") {
      this.index++;
      return new Variable(token.text);
    }
    if (this.accept("(")) {
      const inner = this.parseExpression();
      if (!this.accept(")")) throw new ExpressionError(`expected ')' but found ${describe(this.peek)}`);
      return inner;
    }
    throw new ExpressionError(`expected a number, variable or '(' but found ${describe(token)}`);
  }
}

/** Parses source text into an AST. Throws ExpressionError on syntax errors. */
export function parse(source: string): Expression {
  return new Parser(tokenize(source)).parseAll();
}
