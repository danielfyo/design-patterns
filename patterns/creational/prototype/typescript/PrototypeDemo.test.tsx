// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PrototypeDemo from "./PrototypeDemo.tsx";

const SOURCE = "Invoice | Helvetica 10pt | sections=[Header, Line items, Totals] | metadata={owner=billing, status=template}";

describe("<PrototypeDemo />", () => {
  it("edits a deep clone without touching the source document", async () => {
    const user = userEvent.setup();
    render(<PrototypeDemo />);
    expect(screen.getByText("None yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(
      screen.getByText(
        "Invoice #1 | Georgia 10pt | sections=[Cover for #1, Line items, Totals] | metadata={owner=billing, status=edited}",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(SOURCE)).toBeInTheDocument();
  });

  it("leaks edits into the source when the shallow copy is used, until reset", async () => {
    const user = userEvent.setup();
    render(<PrototypeDemo />);

    await user.click(screen.getByLabelText(/shallow copy/));
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.queryByText(SOURCE)).not.toBeInTheDocument();
    expect(screen.getByText("Invoice | Georgia 10pt", { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByText(SOURCE)).toBeInTheDocument();
    expect(screen.getByText("None yet.")).toBeInTheDocument();
  });
});
