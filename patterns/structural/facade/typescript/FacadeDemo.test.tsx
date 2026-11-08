// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import FacadeDemo from "./FacadeDemo.tsx";

function quantityInput(sku: string): HTMLElement {
  const row = screen.getByText(sku).closest("tr");
  if (row === null) throw new Error(`no row for ${sku}`);
  const input = row.querySelector("input");
  if (input === null) throw new Error(`no input for ${sku}`);
  return input;
}

describe("<FacadeDemo />", () => {
  it("places an order with one click and updates the stock", async () => {
    const user = userEvent.setup();
    render(<FacadeDemo />);

    await user.clear(quantityInput("keyboard"));
    await user.type(quantityInput("keyboard"), "2");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(screen.getByText("Confirmed: $159.98, tracking SHP-5001")).toBeInTheDocument();
    expect(screen.getByText("8 in stock")).toBeInTheDocument();
  });

  it("reports a failure and keeps the stock when an item is out of stock", async () => {
    const user = userEvent.setup();
    render(<FacadeDemo />);

    await user.clear(quantityInput("webcam"));
    await user.type(quantityInput("webcam"), "5");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(screen.getByText("Failed: webcam is out of stock (requested 5, available 3)")).toBeInTheDocument();
    expect(screen.getByText("3 in stock")).toBeInTheDocument();
  });
});
