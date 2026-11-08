// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MediatorDemo from "./MediatorDemo.tsx";

const panel = (title: string) =>
  screen.getByText(title).nextElementSibling?.textContent ?? "";

describe("<MediatorDemo />", () => {
  it("routes !help to the bot, which answers the sender privately", async () => {
    const user = userEvent.setup();
    render(<MediatorDemo />);

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(panel("alice's inbox")).toMatch(
      /^\[alice\] HelpBot \(private\): Hi alice!/,
    );
    expect(panel("bob's inbox")).toBe("[bob] alice: !help");
    expect(panel("Room log (mediator)")).toContain("alice -> everyone: !help");
  });

  it("delivers a private message to one inbox only", async () => {
    const user = userEvent.setup();
    render(<MediatorDemo />);
    const [from, to] = screen.getAllByRole("combobox");

    await user.selectOptions(from, "bob");
    await user.selectOptions(to, "carol");
    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "Lunch?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(panel("carol's inbox")).toBe("[carol] bob (private): Lunch?");
    expect(panel("alice's inbox")).toBe("");
  });

  it("lets the room report a recipient who is not there", async () => {
    const user = userEvent.setup();
    render(<MediatorDemo />);

    await user.selectOptions(screen.getAllByRole("combobox")[1], "dave");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(panel("Room log (mediator)")).toContain(
      "[room] dave is not in this room",
    );
  });
});
