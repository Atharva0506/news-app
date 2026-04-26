import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

/**
 * Lightweight rendering tests for key page components.
 * These verify that components mount without crashing and render
 * their essential UI elements — a critical baseline for any app.
 */

// Mock the auth context since most pages depend on it
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isLoggingIn: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the API module
vi.mock("@/lib/api", () => ({
  api: {
    auth: { me: vi.fn(), featureFlags: vi.fn().mockResolvedValue({}) },
    news: { getFeed: vi.fn().mockResolvedValue([]) },
    explore: { feed: vi.fn().mockResolvedValue([]), categories: vi.fn().mockResolvedValue([]) },
    payments: { getConfig: vi.fn().mockResolvedValue({ pro_plan_price: 0.1, solana_network: "devnet" }) },
  },
  API_URL: "http://localhost:8000/api/v1",
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children as React.ReactNode}</div>;
    },
    a: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
      return <a {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children as React.ReactNode}</a>;
    },
    button: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
      return <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children as React.ReactNode}</button>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useTransform: () => ({ set: vi.fn(), get: () => 0 }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("ForgotPassword page", () => {
  it("renders the forgot password form", async () => {
    const { default: ForgotPassword } = await import("@/pages/ForgotPassword");
    renderWithRouter(<ForgotPassword />);

    expect(screen.getByText("Forgot Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });
});

describe("ResetPassword page", () => {
  it("shows invalid link when no token is provided", async () => {
    const { default: ResetPassword } = await import("@/pages/ResetPassword");
    renderWithRouter(<ResetPassword />);

    expect(screen.getByText("Invalid Link")).toBeInTheDocument();
    expect(screen.getByText("Missing reset token.")).toBeInTheDocument();
  });
});
