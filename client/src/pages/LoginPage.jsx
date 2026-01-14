// /client/src/pages/LoginPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth-store.js";

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const startGoogleLogin = useAuthStore((s) => s.startGoogleLogin);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/boards";

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState(""); // confirm password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => (mode === "login" ? "Sign in" : "Create account"), [mode]);

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
    setPassword("");
    setPassword2("");
  };

  const submit = async () => {
    try {
      setLoading(true);
      setError("");

      const e = email.trim();
      if (!e || !e.includes("@")) throw new Error("Please enter a valid email");

      if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

      if (mode === "register") {
        const n = name.trim();
        if (!n) throw new Error("Name is required");

        if (password !== password2) throw new Error("Passwords do not match");

        await register(n, e, password);
      } else {
        await login(e, password);
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    try {
      setError("");
      await startGoogleLogin();
    } catch (err) {
      setError(err.message || "Google login failed");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow-sm" style={{ minWidth: 360 }}>
        <div className="card-body">
          <h5 className="card-title mb-2 text-center">{title}</h5>
          <p className="text-muted small mb-3 text-center">
            {mode === "login" ? "Login with email + password" : "Register a new account"}
          </p>

          {error && <div className="alert alert-danger py-2 px-3 small">{error}</div>}

          {mode === "register" && (
            <div className="mb-2">
              <label className="form-label small fw-semibold">Name</label>
              <input
                className="form-control form-control-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="mb-2">
            <label className="form-label small fw-semibold">Email</label>
            <input
              className="form-control form-control-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="mb-2">
            <label className="form-label small fw-semibold">Password</label>
            <input
              type="password"
              className="form-control form-control-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>

          {mode === "register" && (
            <div className="mb-3">
              <label className="form-label small fw-semibold">Repeat password</label>
              <input
                type="password"
                className="form-control form-control-sm"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </div>
          )}

          {mode === "login" ? <div className="mb-3" /> : null}

          <button className="btn btn-primary w-100" onClick={submit} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>

          <button className="btn btn-outline-secondary w-100 mt-2" onClick={google} disabled={loading}>
            <i className="mdi mdi-google me-2" />
            Continue with Google
          </button>

          <div className="d-flex justify-content-between mt-3">
            <button className="btn btn-link btn-sm p-0" onClick={toggleMode} disabled={loading}>
              {mode === "login" ? "Create account" : "I already have an account"}
            </button>

            <span className="text-muted small">{mode === "login" ? "" : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
