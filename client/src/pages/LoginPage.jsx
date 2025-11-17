// /client/src/pages/LoginPage.jsx
// Very small login screen that calls POST /auth/login-mock.
// On success it stores fake JWT + user in auth-store and redirects.
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth-store.js";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const loginMock = useAuthStore((s) => s.loginMock);
  const navigate = useNavigate();
  const location = useLocation();

  // If user was redirected from a protected page, go back there after login.
  const from = location.state?.from?.pathname || "/boards";

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginMock();
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow-sm" style={{ minWidth: 320 }}>
        <div className="card-body">
          <h5 className="card-title mb-3 text-center">Sign in (mock)</h5>
          <p className="text-muted small mb-4 text-center">
            Uses <code>POST /auth/login-mock</code> and stores a fake JWT.
          </p>
          <button
            className="btn btn-primary w-100"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Signing in...
              </>
            ) : (
              <>
                <i className="mdi mdi-login-variant me-2" />
                Sign in (mock)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
