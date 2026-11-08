// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import BridgeDemo from "./BridgeDemo.tsx";

describe("<BridgeDemo />", () => {
  it("renders the sales report as Markdown by default", () => {
    render(<BridgeDemo />);

    expect(screen.getByText(/# Sales by region/)).toHaveTextContent("**Total: 31000.00**");
  });

  it("combines the chosen report and renderer independently", async () => {
    const user = userEvent.setup();
    render(<BridgeDemo />);

    await user.click(screen.getByLabelText("HTML"));
    expect(screen.getByText(/<h1>Sales by region<\/h1>/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Inventory report"));
    expect(screen.getByText(/<h1>Inventory status<\/h1>/)).toHaveTextContent("<footer>Total units: 49</footer>");

    await user.click(screen.getByLabelText("CSV"));
    expect(screen.getByText(/report,Inventory status/)).toHaveTextContent("Total units,49");
  });

  it("explains how many combinations the classes give", () => {
    render(<BridgeDemo />);

    expect(screen.getByText(/combinations, built from 5 classes/)).toHaveTextContent("2 reports × 3 renderers = 6");
  });
});
