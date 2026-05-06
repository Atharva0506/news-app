import { describe, it, expect } from "vitest";
import { cn, formatDate, truncateText } from "@/lib/utils";

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

describe("formatDate", () => {
  it("should format date with default options", () => {
    const date = new Date("2026-05-06T12:00:00Z");
    const result = formatDate(date);
    expect(result).toBe("May 6, 2026");
  });

  it("should allow overriding options", () => {
    const date = new Date("2026-05-06T12:00:00Z");
    const result = formatDate(date, { month: "long", year: "numeric" });
    expect(result).toBe("May 2026");
  });
});

describe("truncateText", () => {
  it("should truncate text exceeding max length and append ellipsis", () => {
    const text = "This is a very long sentence that needs to be shortened.";
    const result = truncateText(text, 10);
    expect(result).toBe("This is a ...");
  });

  it("should return the original text if length is within limit", () => {
    const text = "Short";
    const result = truncateText(text, 10);
    expect(result).toBe("Short");
  });
});
