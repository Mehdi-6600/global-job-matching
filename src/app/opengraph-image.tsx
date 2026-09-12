import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-size";

export const runtime = "edge";
export const alt = "Global Job Matching — Find jobs worldwide";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0e7490 100%)",
          padding: "56px 64px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #22d3ee, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f172a",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            G
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ color: "#f8fafc", fontSize: 28, fontWeight: 700 }}>
              Global Job Matching
            </span>
            <span style={{ color: "#94a3b8", fontSize: 18 }}>
              Jobs · Employers · Career tools
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              color: "#f8fafc",
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            Find your next role worldwide
          </div>
          <div
            style={{
              color: "#cbd5e1",
              fontSize: 26,
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            Browse global and remote jobs, apply in one place, and hire talent
            on a modern secure board.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#67e8f9", fontSize: 22, fontWeight: 600 }}>
            global-job-matching.vercel.app
          </span>
          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            {["Remote", "Worldwide", "AI career tools"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(103,232,249,0.35)",
                  color: "#e2e8f0",
                  fontSize: 18,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
