// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import InterpreterDemo from "./InterpreterDemo.tsx";

describe("<InterpreterDemo />", () => {
  it("re-interprets the same rule when a variable changes", async () => {
    const user = userEvent.setup();
    render(<InterpreterDemo />);
    expect(screen.getByText("31.46")).toBeInTheDocument();

    const shipping = screen.getByLabelText("shipping");
    await user.clear(shipping);
    await user.type(shipping, "0");

    expect(screen.getByText("24.20")).toBeInTheDocument();
  });

  it("shows the canonical AST of a new rule and a syntax error for an incomplete one", async () => {
    const user = userEvent.setup();
    render(<InterpreterDemo />);
    const rule = screen.getByLabelText("Rule");

    await user.clear(rule);
    await user.type(rule, "price * quantity - discount");
    expect(screen.getByText("((price * quantity) - discount)")).toBeInTheDocument();
    expect(screen.getByText("55.00")).toBeInTheDocument();

    await user.type(rule, " -");
    expect(
      screen.getByText("Syntax error: expected a number, variable or '(' but found end of input"),
    ).toBeInTheDocument();
  });
});
