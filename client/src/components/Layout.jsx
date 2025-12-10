// /client/src/components/Layout.jsx
// Application shell with a narrow top navbar and main content area.
// Shows current user info and logout button when authenticated.

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
      {/* Top navbar with app name and user area */}
      <nav className="navbar tm-navbar">
        <div className="container tm-navbar-inner">
          {/* App logo / title */}
          <Link
            className="navbar-brand d-flex align-items-center tm-logo"
            to="/"
          >
            <i className="mdi mdi-view-kanban-outline me-2" />
            <span>Task Manager</span>
          </Link>

          {/* User info and auth actions */}
          <div className="d-flex align-items-center gap-2 tm-user-area">
            {user && (
              <span className="navbar-text small d-flex align-items-center">
                <i className="mdi mdi-account-circle-outline me-1" />
                {user.email}
              </span>
            )}
            {user ? (
              <button
                className="btn btn-outline-dark btn-sm"
                onClick={handleLogout}
              >
                <i className="mdi mdi-logout me-1" />
                Logout
              </button>
            ) : (
              <Link className="btn btn-outline-dark btn-sm" to="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main routed content */}
      <main className="tm-main container py-4">
        <Outlet />
      </main>
    </>
  );
}
