// src/pages/Login.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";

// Mock the auth hook entirely — we control exactly what login()/verifyMfa()
// resolve to in each test, without needing a real AuthContext provider.
const loginMock = vi.fn();
const verifyMfaMock = vi.fn();

vi.mock("../store/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    verifyMfa: verifyMfaMock,
  }),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/change-password" element={<div>Change Password Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Login", () => {
  beforeEach(() => {
    loginMock.mockReset();
    verifyMfaMock.mockReset();
  });

  it("shows validation errors for invalid email and short password", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@lawfirm.co.ke"), "not-an-email");
    await user.type(screen.getByPlaceholderText("••••••••"), "123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("navigates to /dashboard on successful login with no extra steps", async () => {
    loginMock.mockResolvedValue({ passwordExpired: false, mfaRequired: false, mustChangePassword: false });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@lawfirm.co.ke"), "lawyer@test.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("lawyer@test.com", "password123");
    });
    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });

  it("shows an expired-password message and does not navigate", async () => {
    loginMock.mockResolvedValue({ passwordExpired: true });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@lawfirm.co.ke"), "lawyer@test.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/temporary password has expired/i)).toBeInTheDocument();
    expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
  });

  it("redirects to /change-password when the account requires it", async () => {
    loginMock.mockResolvedValue({ mustChangePassword: true });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@lawfirm.co.ke"), "lawyer@test.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Change Password Page")).toBeInTheDocument();
  });

  it("shows a generic error on rejected credentials", async () => {
    loginMock.mockRejectedValue(new Error("Unauthorized"));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@lawfirm.co.ke"), "lawyer@test.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });

  describe("MFA flow", () => {
    async function getToMfaScreen(user: ReturnType<typeof userEvent.setup>) {
      loginMock.mockResolvedValue({ mfaRequired: true });
      await user.type(screen.getByPlaceholderText("you@lawfirm.co.ke"), "lawyer@test.com");
      await user.type(screen.getByPlaceholderText("••••••••"), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));
      expect(await screen.findByText("Two-Factor Authentication")).toBeInTheDocument();
    }

    it("switches to the MFA screen when the account requires it", async () => {
      const user = userEvent.setup();
      renderLogin();
      await getToMfaScreen(user);
    });

    it("verifies a valid code and navigates to /dashboard", async () => {
      const user = userEvent.setup();
      renderLogin();
      await getToMfaScreen(user);

      verifyMfaMock.mockResolvedValue({ mustChangePassword: false });
      await user.type(screen.getByPlaceholderText("000000"), "123456");
      await user.click(screen.getByRole("button", { name: /verify code/i }));

      await waitFor(() => {
        expect(verifyMfaMock).toHaveBeenCalledWith("lawyer@test.com", "123456");
      });
      expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
    });

    it("shows an error for an invalid or expired MFA code", async () => {
      const user = userEvent.setup();
      renderLogin();
      await getToMfaScreen(user);

      verifyMfaMock.mockRejectedValue(new Error("Invalid code"));
      await user.type(screen.getByPlaceholderText("000000"), "000000");
      await user.click(screen.getByRole("button", { name: /verify code/i }));

      expect(await screen.findByText("Invalid or expired code. Try again.")).toBeInTheDocument();
    });

    it("returns to the login screen via the back button", async () => {
      const user = userEvent.setup();
      renderLogin();
      await getToMfaScreen(user);

      await user.click(screen.getByRole("button", { name: /back to login/i }));

      expect(screen.getByText("Sign in to your firm")).toBeInTheDocument();
    });
  });
});