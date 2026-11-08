// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The demo keeps its ticker at module level, so every test loads a fresh copy of the module.
let ObserverDemo: ComponentType;
beforeEach(async () => {
  vi.resetModules();
  ({ default: ObserverDemo } = await import("./ObserverDemo.tsx"));
});

const plus = (index: number) =>
  screen.getAllByRole("button", { name: "+$2.50" })[index];

describe("<ObserverDemo />", () => {
  it("re-renders every subscribed component when a price changes", async () => {
    const user = userEvent.setup();
    render(<ObserverDemo />);
    expect(screen.getByText(/Portfolio .*: \$4006\.00/)).toBeInTheDocument();

    await user.click(plus(0));

    expect(screen.getByText("$198.00")).toBeInTheDocument();
    expect(screen.getByText(/Portfolio .*: \$4031\.00/)).toBeInTheDocument();
  });

  it("raises an alert once AAPL goes above $200", async () => {
    const user = userEvent.setup();
    render(<ObserverDemo />);
    expect(screen.getByText("No alerts (AAPL > $200.00)")).toBeInTheDocument();

    await user.click(plus(0));
    await user.click(plus(0));

    expect(
      screen.getByText("[alert] AAPL is above $200.00: now $200.50"),
    ).toBeInTheDocument();
  });

  it("stops updating the display once it is unmounted, while others keep observing", async () => {
    const user = userEvent.setup();
    render(<ObserverDemo />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(plus(1));

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/Portfolio .*: \$4018\.50/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));
    expect(
      within(screen.getByRole("list")).getByText("$412.70"),
    ).toBeInTheDocument();
  });
});
