import { useMemo, useState } from "react";
import {
  Add,
  BinaryExpression,
  Context,
  Divide,
  ExpressionError,
  Multiply,
  NumberLiteral,
  Subtract,
  Variable,
  type Expression,
} from "./expressions.ts";
import { parse } from "./parser.ts";

const INITIAL_VARIABLES: Record<string, number> = {
  price: 20,
  quantity: 3,
  discount: 5,
  shipping: 6,
  taxRate: 0.21,
};

/** Class names, resolved with instanceof (constructor.name does not survive minification). */
function kindOf(node: Expression): string {
  if (node instanceof Add) return "Add";
  if (node instanceof Subtract) return "Subtract";
  if (node instanceof Multiply) return "Multiply";
  if (node instanceof Divide) return "Divide";
  if (node instanceof NumberLiteral) return "NumberLiteral";
  if (node instanceof Variable) return "Variable";
  return "Expression";
}

/** Renders the AST as a nested list, so the tree of Expression objects is visible. */
function AstNode({ node }: { node: Expression }) {
  if (node instanceof BinaryExpression) {
    return (
      <li>
        <code>{node.symbol}</code> <small>({kindOf(node)})</small>
        <ul>
          <AstNode node={node.left} />
          <AstNode node={node.right} />
        </ul>
      </li>
    );
  }
  return (
    <li>
      <code>{node.toString()}</code> <small>({kindOf(node)})</small>
    </li>
  );
}

/**
 * React usage: parsing is the expensive, structural step, so the AST is memoized
 * on the rule text only. Changing a variable re-interprets the SAME tree against
 * a new Context — exactly the "build once, interpret many times" benefit.
 */
export default function InterpreterDemo() {
  const [rule, setRule] = useState("(price + shipping) * (1 + taxRate)");
  const [variables, setVariables] = useState(INITIAL_VARIABLES);

  const parsed = useMemo((): { ast: Expression } | { error: string } => {
    try {
      return { ast: parse(rule) };
    } catch (e) {
      if (e instanceof ExpressionError) return { error: e.message };
      throw e;
    }
  }, [rule]);

  let value: string | null = null;
  if ("ast" in parsed) {
    try {
      value = parsed.ast.interpret(new Context(new Map(Object.entries(variables)))).toFixed(2);
    } catch (e) {
      if (!(e instanceof ExpressionError)) throw e;
      value = `error: ${e.message}`;
    }
  }

  return (
    <section>
      <h2>Interpreter — Pricing rule expression language</h2>
      <label>
        Rule <input value={rule} onChange={(e) => setRule(e.target.value)} size={40} />
      </label>
      <fieldset>
        <legend>Context (variables)</legend>
        {Object.entries(variables).map(([name, v]) => (
          <label key={name} style={{ marginRight: 12 }}>
            {name}{" "}
            <input
              type="number"
              step="any"
              value={v}
              style={{ width: 70 }}
              onChange={(e) => setVariables({ ...variables, [name]: Number(e.target.value) })}
            />
          </label>
        ))}
      </fieldset>
      {"error" in parsed ? (
        <p style={{ color: "crimson" }}>Syntax error: {parsed.error}</p>
      ) : (
        <>
          <p>
            Canonical AST: <code>{parsed.ast.toString()}</code>
          </p>
          <p>
            Value: <strong>{value}</strong>
          </p>
          <ul>
            <AstNode node={parsed.ast} />
          </ul>
        </>
      )}
    </section>
  );
}
