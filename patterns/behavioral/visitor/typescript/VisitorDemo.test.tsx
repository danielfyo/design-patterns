// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import VisitorDemo from "./VisitorDemo.tsx";

const total = () => screen.getByText(/^Total:/).querySelector("strong");

describe("<VisitorDemo />", () => {
  it("runs a different operation over the same cart when the user picks another visitor", async () => {
    const user = userEvent.setup();
    render(<VisitorDemo />);
    expect(total()).toHaveTextContent("$306.90");

    await user.click(screen.getByLabelText("TaxCalculator"));
    expect(total()).toHaveTextContent("$57.22");

    await user.click(screen.getByLabelText("ShippingCostCalculator"));
    expect(total()).toHaveTextContent("$23.33");
  });

  it("recomputes the result when the user removes an item from the cart", async () => {
    const user = userEvent.setup();
    render(<VisitorDemo />);

    await user.click(screen.getByLabelText(/Electronics: Monitor/));

    expect(total()).toHaveTextContent("$107.90");
    expect(screen.queryByText(/\[Electronics\] Monitor/)).not.toBeInTheDocument();
  });

  it("shows an empty cart when every item is removed", async () => {
    const user = userEvent.setup();
    render(<VisitorDemo />);

    for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);

    expect(screen.getByText("(empty cart)")).toBeInTheDocument();
    expect(total()).toHaveTextContent("$0.00");
  });
});
