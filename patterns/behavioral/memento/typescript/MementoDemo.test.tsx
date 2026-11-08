// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MementoDemo from "./MementoDemo.tsx";

describe("<MementoDemo />", () => {
  it("undo restores the last saved snapshot", async () => {
    const user = userEvent.setup();
    const { container } = render(<MementoDemo />);
    const text = () => container.querySelector("pre")?.textContent;

    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.click(screen.getByRole("button", { name: "Save snapshot" }));
    expect(screen.getByText("1 snapshot(s) in history")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.click(screen.getByRole("button", { name: "Backspace" }));
    expect(text()).toBe(" world worl|");

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(text()).toBe(" world|");
    expect(screen.getByText("0 snapshot(s) in history")).toBeInTheDocument();
  });

  it("disables undo while the history is empty", async () => {
    const user = userEvent.setup();
    render(<MementoDemo />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Save snapshot" }));

    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
  });
});
