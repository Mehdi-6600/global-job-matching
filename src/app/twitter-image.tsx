import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-size";

export const runtime = "edge";
export const alt = "Global Job Matching — Find jobs worldwide";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Same card as Open Graph for Twitter/X large image cards */
export default function TwitterImage() {
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
          <span style={{ color: "#f8fafc", fontSize: 28, fontWeight: 700 }}>
            Global Job Matching
          </span>
        </div>

        <div
          style={{
            color: "#f8fafc",
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          Find jobs & hire talent worldwide
        </div>

        <span style={{ color: "#67e8f9", fontSize: 22, fontWeight: 600 }}>
          global-job-matching.vercel.app
        </span>
      </div>
    ),
    { ...OG_SIZE }
  );
}
