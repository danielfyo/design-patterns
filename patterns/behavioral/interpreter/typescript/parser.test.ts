import { describe, expect, it } from "vitest";
import { Context, ExpressionError } from "./expressions.ts";
import { parse } from "./parser.ts";

const regular = new Context(
  new Map(Object.entries({ price: 20, quantity: 3, discount: 5, shipping: 6, taxRate: 0.21 })),
);

describe("Interpreter: parser", () => {
  it.each([
    ["1 + 2 * 3", "(1 + (2 * 3))", 7],
    ["(1 + 2) * 3", "((1 + 2) * 3)", 9],
    ["10 - 4 - 3", "((10 - 4) - 3)", 3],
    ["24 / 4 / 2", "((24 / 4) / 2)", 3],
    ["price * quantity - discount", "((price * quantity) - discount)", 55],
  ])("parses %s respecting precedence and left associativity", (source, ast, value) => {
    const expression = parse(source);

    expect(expression.toString()).toBe(ast);
    expect(expression.interpret(regular)).toBeCloseTo(value);
  });

  it("reinterprets the same AST against different contexts", () => {
    const ast = parse("(price + shipping) * (1 + taxRate)");
    const bulk = new Context(new Map(Object.entries({ price: 12.5, shipping: 8, taxRate: 0.1 })));

    expect(ast.interpret(regular)).toBeCloseTo(31.46);
    expect(ast.interpret(bulk)).toBeCloseTo(22.55);
  });

  it("parses a rule with an unknown variable but fails when interpreting it", () => {
    const ast = parse("price * coupon");

    expect(() => ast.interpret(regular)).toThrow(new ExpressionError("unknown variable 'coupon'"));
  });

  it.each([
    ["(price + 1", "expected ')' but found end of input"],
    ["price +", "expected a number, variable or '(' but found end of input"],
    ["price price", "expected end of input but found 'price'"],
    ["price % 2", "unexpected character '%' at position 6"],
    ["1.2.3", "invalid number '1.2.3' at position 0"],
  ])("reports the syntax error in %j", (source, message) => {
    expect(() => parse(source)).toThrow(new ExpressionError(message));
  });
});
