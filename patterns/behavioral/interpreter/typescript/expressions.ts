/**
 * Interpreter pattern: the AST classes of a tiny pricing-rule language.
 * Framework-agnostic core, reused by the console demo (main.ts)
 * and the React demo (InterpreterDemo.tsx). The parser lives in parser.ts.
 */

/** Raised for syntax errors (parser) and evaluation errors (interpreter). */
export class ExpressionError extends Error {
  override name = "ExpressionError";
}

/** Context: the global information expressions are interpreted against (variable values). */
export class Context {
  constructor(readonly variables: ReadonlyMap<string, number>) {}

  lookup(name: string): number {
    const value = this.variables.get(name);
    if (value === undefined) throw new ExpressionError(`unknown variable '${name}'`);
    return value;
  }
}

/** Shortest round-trip form: 2, 0.21, 12.5 (identical in every language of the repo). */
export const formatNumber = (value: number): string => String(value);

/**
 * Abstract Expression: one class per grammar rule implements this interface.
 * Interpreting a sentence means calling `interpret` on the root of its AST.
 * `toString` prints the AST in a fully parenthesized canonical form.
 */
export interface Expression {
  interpret(context: Context): number;
  toString(): string;
}

/** Terminal Expression: a numeric literal such as `2` or `0.9`. */
export class NumberLiteral implements Expression {
  constructor(readonly value: number) {}
  interpret(): number {
    return this.value;
  }
  toString(): string {
    return formatNumber(this.value);
  }
}

/** Terminal Expression: a variable resolved through the context. */
export class Variable implements Expression {
  constructor(readonly name: string) {}
  interpret(context: Context): number {
    return context.lookup(this.name);
  }
  toString(): string {
    return this.name;
  }
}

/**
 * Shared shape of the Nonterminal Expressions: two sub-expressions and an
 * operator symbol. Each subclass interprets its children and combines them.
 */
export abstract class BinaryExpression implements Expression {
  abstract readonly symbol: string;
  constructor(
    readonly left: Expression,
    readonly right: Expression,
  ) {}
  abstract interpret(context: Context): number;
  toString(): string {
    return `(${this.left} ${this.symbol} ${this.right})`;
  }
}

/** Nonterminal Expression: `left + right`. */
export class Add extends BinaryExpression {
  readonly symbol = "+";
  interpret(context: Context): number {
    return this.left.interpret(context) + this.right.interpret(context);
  }
}

/** Nonterminal Expression: `left - right`. */
export class Subtract extends BinaryExpression {
  readonly symbol = "-";
  interpret(context: Context): number {
    return this.left.interpret(context) - this.right.interpret(context);
  }
}

/** Nonterminal Expression: `left * right`. */
export class Multiply extends BinaryExpression {
  readonly symbol = "*";
  interpret(context: Context): number {
    return this.left.interpret(context) * this.right.interpret(context);
  }
}

/** Nonterminal Expression: `left / right` (division by zero is an error). */
export class Divide extends BinaryExpression {
  readonly symbol = "/";
  interpret(context: Context): number {
    const divisor = this.right.interpret(context);
    if (divisor === 0) throw new ExpressionError("division by zero");
    return this.left.interpret(context) / divisor;
  }
}
