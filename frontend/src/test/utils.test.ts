import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn — className merge utility", () => {
  it("should merge multiple class names", () => {
    const result = cn("px-4", "py-2");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("base");
    expect(result).toContain("active");
  });

  it("should filter out falsy values", () => {
    const result = cn("base", false, null, undefined, "extra");
    expect(result).toBe("base extra");
  });

  it("should resolve Tailwind conflicts — last class wins", () => {
    // tailwind-merge resolves conflicting utilities
    const result = cn("px-4", "px-8");
    expect(result).toBe("px-8");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should merge with array syntax", () => {
    const result = cn(["px-4", "py-2"]);
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
  });
});
