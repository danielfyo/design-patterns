// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CommandDemo from "./CommandDemo.tsx";

describe("<CommandDemo />", () => {
  it("undoes and redoes an insert", async () => {
    const user = userEvent.setup();
    const { container } = render(<CommandDemo />);
    const content = () => container.querySelector("pre")?.textContent;

    await user.click(screen.getByRole("button", { name: "Insert" }));
    expect(content()).toBe("Hello");

    await user.click(screen.getByRole("button", { name: "Undo (1)" }));
    expect(content()).toBe(" ");
    expect(screen.getByRole("button", { name: "Undo (0)" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Redo (1)" }));
    expect(content()).toBe("Hello");
  });

  it("clears redo when a new command runs after an undo", async () => {
    const user = userEvent.setup();
    render(<CommandDemo />);

    await user.click(screen.getByRole("button", { name: "Insert" }));
    await user.click(screen.getByRole("button", { name: "Undo (1)" }));
    expect(screen.getByRole("button", { name: "Redo (1)" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Macro: Shout" }));

    expect(screen.getByRole("button", { name: "Redo (0)" })).toBeDisabled();
  });
});
