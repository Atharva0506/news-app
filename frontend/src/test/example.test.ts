import { describe, it, expect } from "vitest";

/**
 * Smoke test: verifies the test runner itself works correctly.
 * This serves as a canary — if this test fails, the test infra is broken.
 */
describe("test infrastructure", () => {
  it("vitest runs correctly", () => {
    expect(1 + 1).toBe(2);
  });

  it("handles async operations", async () => {
    const result = await Promise.resolve("hello");
    expect(result).toBe("hello");
  });
});
