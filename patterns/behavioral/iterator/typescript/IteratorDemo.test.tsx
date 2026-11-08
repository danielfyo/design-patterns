// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import IteratorDemo from "./IteratorDemo.tsx";

describe("<IteratorDemo />", () => {
  it("loads products in batches and fetches a page only when needed", async () => {
    const user = userEvent.setup();
    const { container } = render(<IteratorDemo />);
    const log = () => container.querySelector("pre")?.textContent;

    await user.click(screen.getByRole("button", { name: "Load 2 more" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(log()).toBe("[api] fetching page 1");

    await user.click(screen.getByRole("button", { name: "Load 2 more" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(log()).toBe("[api] fetching page 1\n[api] fetching page 2");
  });

  it("disables loading once the iterator is exhausted, and reset starts over", async () => {
    const user = userEvent.setup();
    render(<IteratorDemo />);

    for (let i = 0; i < 4; i++)
      await user.click(screen.getByRole("button", { name: /Load 2 more/ }));

    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText(/Desk lamp/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "No more products" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Load 2 more" })).toBeEnabled();
  });
});
