// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AdapterDemo from "./AdapterDemo.tsx";

describe("<AdapterDemo />", () => {
  it("pays through the adapted SDK by default", async () => {
    const user = userEvent.setup();
    render(<AdapterDemo />);

    await user.click(screen.getByRole("button", { name: "Pay" }));

    const log = screen.getByText(/Checkout with PayPro \(adapted\)/);
    expect(log).toHaveTextContent('makeTransaction(4999, "USD", "MERCHANT-42")');
    expect(log).toHaveTextContent("result: success=true, id=PP-000001, message=Approved");
  });

  it("uses the same checkout with the native wallet", async () => {
    const user = userEvent.setup();
    render(<AdapterDemo />);

    await user.click(screen.getByLabelText("Internal wallet"));
    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(screen.getByText(/Checkout with Internal wallet/)).toHaveTextContent(
      "result: success=true, id=WAL-0001, message=Paid from wallet",
    );
  });

  it("shows the translated error when the currency is not supported", async () => {
    const user = userEvent.setup();
    render(<AdapterDemo />);

    await user.selectOptions(screen.getByLabelText(/Currency/), "GBP");
    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(screen.getByText(/Checkout with PayPro/)).toHaveTextContent(
      "message=Currency not supported by PayPro",
    );
  });
});
