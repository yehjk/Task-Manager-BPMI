// /client/src/components/Layout.jsx
// Top-level layout for all pages:
// - dark navbar with app name
// - user email + Logout button
// - <Outlet /> for nested routes
import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store.js";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <i className="mdi mdi-view-kanban-outline me-2"></i>
            Task Manager
          </Link>

          <div className="d-flex align-items-center">
            {user && (
              <span className="navbar-text me-3 small">
                <i className="mdi mdi-account-circle-outline me-1" />
                {user.email}
              </span>
            )}
            {user ? (
              <button
                className="btn btn-outline-light btn-sm"
                onClick={handleLogout}
              >
                <i className="mdi mdi-logout me-1" />
                Logout
              </button>
            ) : (
              <Link className="btn btn-outline-light btn-sm" to="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="container-fluid py-3">
        <Outlet />
      </main>
    </>
  );
}
