// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import FactoryMethodDemo from "./FactoryMethodDemo.tsx";

describe("<FactoryMethodDemo />", () => {
  it("sends through the creator picked in the channel select", async () => {
    const user = userEvent.setup();
    render(<FactoryMethodDemo />);
    expect(screen.getByText(/Nothing sent yet/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Channel/), "sms");
    await user.click(screen.getByRole("button", { name: "Notify Alice" }));

    expect(screen.getByText('SmsService -> SMS to +1-555-0100: "Hi Alice, your order #1001 ha..."')).toBeInTheDocument();
  });

  it("logs the validation error for an empty message, newest entry first", async () => {
    const user = userEvent.setup();
    render(<FactoryMethodDemo />);
    await user.click(screen.getByRole("button", { name: "Notify Alice" }));

    await user.clear(screen.getByLabelText(/Message/));
    await user.click(screen.getByRole("button", { name: "Notify Alice" }));

    const log = screen.getByText(/error: message must not be empty/);
    expect(log.textContent?.split("\n")).toEqual([
      "EmailService -> error: message must not be empty",
      'EmailService -> EMAIL to alice@example.com: "Hi Alice, your order #1001 has shipped."',
    ]);
  });
});
