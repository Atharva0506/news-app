import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, API_URL } from "@/lib/api";

describe("ApiError", () => {
  it("should create an error with status and message", () => {
    const error = new ApiError(404, "Not Found");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not Found");
    expect(error.name).toBe("ApiError");
  });

  it("should be an instance of Error", () => {
    const error = new ApiError(500, "Internal Server Error");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it("should preserve different status codes correctly", () => {
    const cases = [
      { status: 400, message: "Bad Request" },
      { status: 401, message: "Unauthorized" },
      { status: 403, message: "Forbidden" },
      { status: 429, message: "Rate Limited" },
      { status: 500, message: "Server Error" },
    ];

    for (const { status, message } of cases) {
      const error = new ApiError(status, message);
      expect(error.status).toBe(status);
      expect(error.message).toBe(message);
    }
  });
});

describe("API_URL", () => {
  it("should have a default fallback URL", () => {
    // API_URL should be defined (either from env or default)
    expect(API_URL).toBeDefined();
    expect(typeof API_URL).toBe("string");
    expect(API_URL.length).toBeGreaterThan(0);
  });

  it("should contain a valid URL structure", () => {
    // The URL should start with http:// or https://
    expect(API_URL).toMatch(/^https?:\/\//);
  });
});
