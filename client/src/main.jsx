// /client/src/main.jsx
// Entry point for the React application.
// - imports Bootstrap and MDI CSS
// - initializes auth-store from localStorage BEFORE first render
// - mounts React app with BrowserRouter
import "bootstrap/dist/css/bootstrap.min.css";
import "@mdi/font/css/materialdesignicons.min.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { useAuthStore } from "./store/auth-store.js";

// Restore authentication state so that ProtectedRoute
// knows immediately whether user is logged in.
useAuthStore.getState().initFromStorage();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
