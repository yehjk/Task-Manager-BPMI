// /client/src/App.jsx
// React Router configuration for the whole app.
// - /login is public
// - /boards and /boards/:boardId are wrapped in ProtectedRoute
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { BoardsListPage } from "./pages/BoardsListPage.jsx";
import { BoardPage } from "./pages/BoardPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public login page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/boards"
          element={
            <ProtectedRoute>
              <BoardsListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/boards/:boardId"
          element={
            <ProtectedRoute>
              <BoardPage />
            </ProtectedRoute>
          }
        />

        {/* Default route: redirect root to /boards */}
        <Route path="/" element={<Navigate to="/boards" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
