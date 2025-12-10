// /client/src/main.jsx
// React entry point:
// - imports global CSS (Bootstrap, MDI, custom styles)
// - restores auth state before first render
// - mounts the app inside BrowserRouter

import "bootstrap/dist/css/bootstrap.min.css";
import "@mdi/font/css/materialdesignicons.min.css";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { useAuthStore } from "./store/auth-store.js";

// Restore authentication state before rendering the app
useAuthStore.getState().initFromStorage();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
