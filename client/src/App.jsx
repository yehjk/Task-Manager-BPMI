// /client/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import BoardsListPage from "./pages/BoardsListPage.jsx";
import { BoardPage } from "./pages/BoardPage.jsx";
import { InvitesPage } from "./pages/InvitesPage.jsx";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

          <Route
            path="/boards"
            element={
              <ProtectedRoute>
                <BoardsListPage />
              </ProtectedRoute>
            }
          />

          <Route path="/boards/new" element={<Navigate to="/boards" replace />} />

          <Route
            path="/boards/:boardId"
            element={
              <ProtectedRoute>
                <BoardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invites"
            element={
              <ProtectedRoute>
                <InvitesPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/boards" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
