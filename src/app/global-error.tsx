"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error?.digest || error?.message || error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            padding: 32,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(30,41,59,0.8)",
          }}
        >
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Application error</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>
            A critical error occurred. Please reload the page.
          </p>
          {error?.digest ? (
            <p
              style={{
                fontSize: 11,
                color: "#64748b",
                fontFamily: "monospace",
                marginBottom: 16,
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
