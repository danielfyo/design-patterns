// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import SingletonDemo from "./SingletonDemo.tsx";

describe("<SingletonDemo />", () => {
  it("mounts more modules that all read the same instance without reloading it", async () => {
    const user = userEvent.setup();
    render(<SingletonDemo />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Mount another module" }));
    await user.click(screen.getByRole("button", { name: "Mount another module" }));

    const modules = screen.getAllByRole("listitem");
    expect(modules).toHaveLength(4);
    for (const module of modules) {
      expect(within(module).getByText("true")).toBeInTheDocument();
    }
    expect(screen.getByText(/Times loaded/)).toHaveTextContent("Times loaded: 1");
  });

  it("never unmounts the last module", async () => {
    const user = userEvent.setup();
    render(<SingletonDemo />);

    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Unmount one" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("provides the same configuration through context", () => {
    render(<SingletonDemo />);

    expect(screen.getByText("maxConnections = 20")).toBeInTheDocument();
  });
});
