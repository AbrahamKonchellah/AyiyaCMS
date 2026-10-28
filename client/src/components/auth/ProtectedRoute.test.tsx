// src/components/auth/ProtectedRoute.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const useAuthMock = vi.fn();

vi.mock("../../store/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderProtectedRoute(initialPath = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading screen while auth state is resolving", () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: true });

    renderProtectedRoute();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard Content")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no authenticated user", () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: false });

    renderProtectedRoute();

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard Content")).not.toBeInTheDocument();
  });

  it("renders the protected content when a user is authenticated", () => {
    useAuthMock.mockReturnValue({
      user: { id: "1", email: "lawyer@test.com", role: "Associate" },
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});