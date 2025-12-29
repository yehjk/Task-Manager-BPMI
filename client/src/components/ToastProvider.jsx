// /client/src/components/ToastProvider.jsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, options = {}) => {
    const id = crypto?.randomUUID?.() || String(Date.now() + Math.random());
    const variant = options.variant || "success";
    const ttl = typeof options.ttl === "number" ? options.ttl : 2500;

    const toast = { id, message, variant };
    setToasts((prev) => [...prev, toast]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttl);

    return id;
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Container bottom-right */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 2000,
          maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert alert-${t.variant} shadow-sm mb-0`}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className={
                t.variant === "success"
                  ? "mdi mdi-check-circle-outline"
                  : t.variant === "danger"
                    ? "mdi mdi-alert-circle-outline"
                    : t.variant === "warning"
                      ? "mdi mdi-alert-outline"
                      : "mdi mdi-information-outline"
              }
            />
            <div className="small" style={{ lineHeight: 1.25 }}>
              {t.message}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
