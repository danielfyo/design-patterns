// Run with: npx tsx patterns/behavioral/interpreter/typescript/main.ts
import {
  Context,
  ExpressionError,
  Multiply,
  NumberLiteral,
  Variable,
  formatNumber,
  type Expression,
} from "./expressions.ts";
import { parse } from "./parser.ts";

console.log("=== Interpreter Pattern: Pricing rule expression language ===");

const contexts: [string, Context][] = [
  [
    "regular",
    new Context(
      new Map([
        ["price", 20],
        ["quantity", 3],
        ["discount", 5],
        ["shipping", 6],
        ["taxRate", 0.21],
      ]),
    ),
  ],
  [
    "bulk",
    new Context(
      new Map([
        ["price", 12.5],
        ["quantity", 10],
        ["discount", 15],
        ["shipping", 8],
        ["taxRate", 0.1],
      ]),
    ),
  ],
];

for (const [name, context] of contexts) {
  const vars = [...context.variables].map(([k, v]) => `${k}=${formatNumber(v)}`).join(", ");
  console.log(`Context ${`${name}:`.padEnd(9)}${vars}`);
}

// Evaluate one AST against every context. The tree is built once and reused.
function evaluate(ast: Expression): void {
  console.log(`  ${"AST:".padEnd(9)}${ast}`);
  for (const [name, context] of contexts) {
    let result: string;
    try {
      result = ast.interpret(context).toFixed(2);
    } catch (e) {
      if (!(e instanceof ExpressionError)) throw e;
      result = `error: ${e.message}`;
    }
    console.log(`  ${`${name}:`.padEnd(9)}${result}`);
  }
}

// The AST classes ARE the pattern: we can build a sentence by hand, no parser needed.
console.log("Hand-built AST (no parser): price * 0.9");
evaluate(new Multiply(new Variable("price"), new NumberLiteral(0.9)));

const rules = [
  "price * quantity - discount",
  "(price + shipping) * (1 + taxRate)",
  "price * quantity - discount - shipping / 2",
  "price * coupon",
  "(price + 1",
];

for (const rule of rules) {
  console.log(`Rule: ${rule}`);
  let ast: Expression;
  try {
    ast = parse(rule);
  } catch (e) {
    if (!(e instanceof ExpressionError)) throw e;
    console.log(`  syntax error: ${e.message}`);
    continue;
  }
  evaluate(ast);
}
