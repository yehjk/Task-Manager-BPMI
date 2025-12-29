// /client/src/pages/OAuthCallbackPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store.js";

export function OAuthCallbackPage() {
  const applyTokenFromOAuth = useAuthStore((s) => s.applyTokenFromOAuth);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (!token) {
        setError("Token is missing");
        return;
      }
      applyTokenFromOAuth(token);
      navigate("/boards", { replace: true });
    } catch (e) {
      setError(e.message || "OAuth failed");
    }
  }, []);

  if (!error) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="d-flex align-items-center">
          <div className="spinner-border me-2" role="status" />
          <span>Signing you in...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="alert alert-danger">{error}</div>
      <button className="btn btn-primary" onClick={() => navigate("/login")}>
        Back to login
      </button>
    </div>
  );
}
