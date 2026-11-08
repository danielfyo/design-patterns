import { describe, expect, it } from "vitest";
import { Context, Divide, ExpressionError, Multiply, NumberLiteral, Variable, formatNumber } from "./expressions.ts";

const regular = new Context(
  new Map([
    ["price", 20],
    ["quantity", 3],
  ]),
);

describe("Interpreter: expression classes", () => {
  it("interprets a hand-built AST without a parser", () => {
    const ast = new Multiply(new Variable("price"), new NumberLiteral(0.9));

    expect(ast.interpret(regular)).toBeCloseTo(18);
    expect(ast.toString()).toBe("(price * 0.9)");
  });

  it("reports an unknown variable as an evaluation error", () => {
    expect(() => new Variable("coupon").interpret(regular)).toThrow(new ExpressionError("unknown variable 'coupon'"));
  });

  it("checks division by zero before evaluating the dividend", () => {
    const ast = new Divide(new Variable("coupon"), new NumberLiteral(0));

    expect(() => ast.interpret(regular)).toThrow(new ExpressionError("division by zero"));
  });

  it.each([
    [2, "2"],
    [0.21, "0.21"],
    [12.5, "12.5"],
  ])("prints %d in its shortest form", (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});
