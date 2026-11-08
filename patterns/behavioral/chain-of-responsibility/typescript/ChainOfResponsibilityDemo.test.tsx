// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ChainOfResponsibilityDemo from "./ChainOfResponsibilityDemo.tsx";

describe("<ChainOfResponsibilityDemo />", () => {
  it("shows the trace and the response of a request that passes every handler", async () => {
    const user = userEvent.setup();
    render(<ChainOfResponsibilityDemo />);

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("[OrderController] order accepted")).toBeInTheDocument();
    expect(screen.getByText("200 OK - Order accepted for alice: 2x coffee")).toBeInTheDocument();
  });

  it("stops at authentication when the token is forged", async () => {
    const user = userEvent.setup();
    render(<ChainOfResponsibilityDemo />);

    await user.selectOptions(screen.getByLabelText(/Token/), "forged-token");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("401 Unauthorized - Invalid token")).toBeInTheDocument();
    expect(screen.queryByText(/\[RateLimit\]/)).not.toBeInTheDocument();
  });

  it("rate-limits the fourth request and recovers after a reset", async () => {
    const user = userEvent.setup();
    render(<ChainOfResponsibilityDemo />);
    const send = screen.getByRole("button", { name: "Send" });

    for (let i = 0; i < 4; i++) await user.click(send);
    expect(screen.getByText("429 Too Many Requests - Rate limit exceeded")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset rate limiter" }));
    await user.click(send);

    expect(screen.queryByText(/429/)).not.toBeInTheDocument();
    expect(screen.getByText("[RateLimit] 10.0.0.1 request 1/3")).toBeInTheDocument();
  });
});
