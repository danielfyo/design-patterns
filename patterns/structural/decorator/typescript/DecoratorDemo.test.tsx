// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import DecoratorDemo from "./DecoratorDemo.tsx";

const trace = () => screen.getByText(/result:|error:|nothing yet/).textContent ?? "";

describe("<DecoratorDemo />", () => {
  it("retries /users through the full stack and then serves it from the cache", async () => {
    const user = userEvent.setup();
    render(<DecoratorDemo />);

    await user.click(screen.getByRole("button", { name: "GET /users" }));
    expect(trace()).toContain("[retry] attempt 2/3 failed");
    expect(trace()).toContain('result: {"users":["ada","linus"]}');

    await user.click(screen.getByRole("button", { name: "GET /users" }));
    expect(trace()).toContain("[cache] hit /users");
    expect(trace()).not.toContain("[http]");
  });

  it("shows the error when the retry decorator is switched off", async () => {
    const user = userEvent.setup();
    render(<DecoratorDemo />);

    await user.click(screen.getByLabelText("retry"));
    await user.click(screen.getByRole("button", { name: "GET /users" }));

    expect(trace()).toContain("error: 503 Service Unavailable");
    expect(trace()).not.toContain("[retry]");
  });
});
