// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import BuilderDemo from "./BuilderDemo.tsx";

const output = () => screen.getByText(/^(GET|POST|PUT|DELETE|HEAD) |^error:/);

describe("<BuilderDemo />", () => {
  it("shows the validation error when the user adds a body to a GET", async () => {
    const user = userEvent.setup();
    render(<BuilderDemo />);
    expect(output().textContent).toMatch(/^GET https:\/\/api\.example\.com\/users\?page=2/);

    await user.type(screen.getByLabelText("Body"), "x");

    expect(output()).toHaveTextContent("error: GET requests cannot have a body");

    await user.selectOptions(screen.getByLabelText("Method"), "POST");

    expect(output().textContent).toMatch(/^POST .*\n {2}body: x$/s);
  });

  it("starts from a director preset and still applies the extra steps", async () => {
    const user = userEvent.setup();
    render(<BuilderDemo />);

    await user.selectOptions(screen.getByLabelText("Director preset"), "authenticatedGet");

    expect(screen.getByLabelText("Method")).toBeDisabled();
    expect(output().textContent).toContain("Authorization: Bearer demo-token-123");
    expect(output().textContent).toContain("X-Request-Id: req-001");
  });

  it("reports an empty URL as an error", async () => {
    const user = userEvent.setup();
    render(<BuilderDemo />);

    await user.clear(screen.getByLabelText("URL"));

    expect(output()).toHaveTextContent("error: url is required");
  });
});
