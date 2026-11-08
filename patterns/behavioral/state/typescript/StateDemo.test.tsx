// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import StateDemo from "./StateDemo.tsx";

const status = () => screen.getByText(/Order #1001 is/).querySelector("strong");

describe("<StateDemo />", () => {
  it("moves the order forward when the user clicks valid actions", async () => {
    const user = userEvent.setup();
    render(<StateDemo />);
    expect(status()).toHaveTextContent("Pending");

    await user.click(screen.getByRole("button", { name: "pay()" }));
    await user.click(screen.getByRole("button", { name: "ship()" }));

    expect(status()).toHaveTextContent("Shipped");
    expect(screen.getByText(/Order handed to the carrier: Paid -> Shipped/)).toBeInTheDocument();
  });

  it("logs an error and keeps the state when the action is invalid", async () => {
    const user = userEvent.setup();
    render(<StateDemo />);

    await user.click(screen.getByRole("button", { name: "deliver()" }));

    expect(status()).toHaveTextContent("Pending");
    expect(screen.getByText(/ERROR: Cannot deliver an order that has not been shipped/)).toBeInTheDocument();
  });

  it("starts over when the user resets", async () => {
    const user = userEvent.setup();
    render(<StateDemo />);
    await user.click(screen.getByRole("button", { name: "cancel()" }));
    expect(status()).toHaveTextContent("Cancelled");

    await user.click(screen.getByRole("button", { name: "reset" }));

    expect(status()).toHaveTextContent("Pending");
    expect(screen.queryByText(/Order cancelled/)).not.toBeInTheDocument();
  });
});
