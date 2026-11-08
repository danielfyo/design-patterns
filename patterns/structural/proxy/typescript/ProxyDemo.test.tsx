// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ProxyDemo from "./ProxyDemo.tsx";

describe("<ProxyDemo />", () => {
  it("creates the real store on the first open and serves repeats from the cache", async () => {
    const user = userEvent.setup();
    render(<ProxyDemo />);
    expect(screen.getByText(/Real store created:/)).toHaveTextContent(
      "Real store created: false · requests: 0 · remote fetches: 0",
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByText(/Real store created:/)).toHaveTextContent(
      "Real store created: true · requests: 2 · remote fetches: 1",
    );
    expect(screen.getByText(/cache hit doc-1/)).toBeInTheDocument();
  });

  it("denies a viewer access to a confidential document", async () => {
    const user = userEvent.setup();
    render(<ProxyDemo />);

    await user.selectOptions(screen.getByLabelText(/User/), "1");
    await user.selectOptions(screen.getByLabelText(/Document/), "doc-2");
    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByText(/access denied: viewer cannot read confidential doc-2/)).toBeInTheDocument();
  });
});
