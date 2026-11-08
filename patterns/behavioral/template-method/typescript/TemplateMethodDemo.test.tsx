// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TemplateMethodDemo from "./TemplateMethodDemo.tsx";

describe("<TemplateMethodDemo />", () => {
  it("runs the CSV importer through the template when the user clicks import", async () => {
    const user = userEvent.setup();
    render(<TemplateMethodDemo />);
    expect(screen.getByText("Press import(raw) to run the template.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "import(raw)" }));

    expect(screen.getByText(/\[complete\] 4 read, 2 dropped, 2 saved, total \$77\.50/)).toBeInTheDocument();
    expect(screen.getByText(/\[notify\] import report sent to the catalog team/)).toBeInTheDocument();
  });

  it("switches to the JSON importer and applies its transform hook", async () => {
    const user = userEvent.setup();
    render(<TemplateMethodDemo />);

    await user.selectOptions(screen.getByLabelText(/Importer/), "json");
    await user.click(screen.getByRole("button", { name: "import(raw)" }));

    expect(screen.getByText(/\[transform\] el-100 -> EL-100/)).toBeInTheDocument();
    expect(screen.queryByText(/\[notify\]/)).not.toBeInTheDocument();
  });

  it("shows a parse error instead of crashing on invalid input", async () => {
    const user = userEvent.setup();
    render(<TemplateMethodDemo />);
    await user.selectOptions(screen.getByLabelText(/Importer/), "json");

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "not json");
    await user.click(screen.getByRole("button", { name: "import(raw)" }));

    expect(screen.getByText(/^\[error\] /)).toBeInTheDocument();
  });
});
