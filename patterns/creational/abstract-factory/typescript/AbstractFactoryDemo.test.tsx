// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AbstractFactoryDemo from "./AbstractFactoryDemo.tsx";

describe("<AbstractFactoryDemo />", () => {
  it("swaps the whole widget family when the user switches theme", async () => {
    const user = userEvent.setup();
    render(<AbstractFactoryDemo />);
    expect(screen.getByText("Current factory: LightTheme")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("title", "LightButton");
    expect(screen.getAllByTitle("LightCheckbox")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(screen.getByText("Current factory: DarkTheme")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("title", "DarkButton");
    expect(screen.getAllByTitle("DarkCheckbox")).toHaveLength(2);
    expect(screen.queryByTitle("LightCheckbox")).not.toBeInTheDocument();
  });

  it("saves the checkbox state through the themed products", async () => {
    const user = userEvent.setup();
    render(<AbstractFactoryDemo />);

    await user.click(screen.getByLabelText("Weekly digest"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Saved: alerts=true, digest=true")).toBeInTheDocument();
  });
});
