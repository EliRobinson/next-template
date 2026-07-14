import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "ignored", "included")).toBe("base included");
  });
});

describe("placeholder component test", () => {
  it("renders a heading", () => {
    render(<h1>Hello</h1>);
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });
});
