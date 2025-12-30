import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth-store.js";

export function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => !!s.token);
  const isReady = useAuthStore((s) => s.isReady);
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
