// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CompositeDemo from "./CompositeDemo.tsx";

/** The "Total: ... bytes in ... files" paragraph under the tree. */
const totals = () => screen.getByText(/^Total:/);

describe("<CompositeDemo />", () => {
  it("adds a file to a nested folder and updates every total above it", async () => {
    const user = userEvent.setup();
    render(<CompositeDemo />);
    expect(totals()).toHaveTextContent("Total: 12860 bytes in 8 files");

    const addButtons = screen.getAllByRole("button", { name: "+ file" });
    await user.click(addButtons[2]); // project, src, components, assets

    expect(screen.getByText(/new-1\.ts/)).toHaveTextContent("new-1.ts (1000 bytes)");
    expect(screen.getByText("(3400 bytes, 3 files)")).toBeInTheDocument(); // components
    expect(screen.getByText("(6100 bytes, 5 files)")).toBeInTheDocument(); // src
    expect(totals()).toHaveTextContent("Total: 13860 bytes in 9 files");
  });

  it("removes a whole folder in one go", async () => {
    const user = userEvent.setup();
    render(<CompositeDemo />);

    const assets = screen.getByText("assets/").closest("li")!;
    const removeButtons = screen.getAllByTitle("Remove");
    const removeAssets = removeButtons.find((button) => button.parentElement === assets)!;
    await user.click(removeAssets);

    expect(screen.queryByText("assets/")).not.toBeInTheDocument();
    expect(totals()).toHaveTextContent("Total: 7100 bytes in 6 files");
  });

  it("finds files by extension across the tree", async () => {
    const user = userEvent.setup();
    render(<CompositeDemo />);
    expect(screen.getByText("Header.tsx, Footer.tsx")).toBeInTheDocument();

    const input = screen.getByLabelText(/Find by extension/);
    await user.clear(input);
    await user.type(input, ".md");

    expect(screen.getByText("README.md", { selector: "span" })).toBeInTheDocument();
  });
});
