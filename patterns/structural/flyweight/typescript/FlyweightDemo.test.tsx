// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FlyweightDemo from "./FlyweightDemo.tsx";

describe("<FlyweightDemo />", () => {
  it("renders a thousand markers backed by only three style objects", () => {
    const { container } = render(<FlyweightDemo />);

    expect(container.querySelectorAll("circle")).toHaveLength(1000);
    expect(screen.getByText(/Style objects:/)).toHaveTextContent("Style objects: 3");
  });

  it("keeps three styles when the user changes the marker count", () => {
    const { container } = render(<FlyweightDemo />);

    // Range inputs cannot be typed into, so the slider is moved with a change event.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "2500" } });

    expect(screen.getByText(/Markers: 2500/)).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(2500);
    expect(screen.getByText(/Style objects:/)).toHaveTextContent("Style objects: 3");
  });
});
