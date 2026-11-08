// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import StrategyDemo from "./StrategyDemo.tsx";

describe("<StrategyDemo />", () => {
  it("recalculates the cost when the user picks another strategy", async () => {
    const user = userEvent.setup();
    render(<StrategyDemo />);
    expect(screen.getByText("$11.00")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Express"));

    expect(screen.getByText("$27.00")).toBeInTheDocument();
  });

  it("applies free shipping once the subtotal reaches the threshold", async () => {
    const user = userEvent.setup();
    render(<StrategyDemo />);
    await user.click(screen.getByLabelText("Free over $100"));

    const subtotal = screen.getByLabelText(/Subtotal/);
    await user.clear(subtotal);
    await user.type(subtotal, "150");

    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
