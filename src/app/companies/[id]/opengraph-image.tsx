import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { normalizeLocation } from "@/lib/location";
import { OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-size";

export const runtime = "nodejs";
export const alt = "Company on Global Job Matching";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params?: Promise<{ id?: string }> | { id?: string };
};

function truncate(s: string, n: number) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

async function resolveId(params: Props["params"]): Promise<string> {
  if (!params) return "";
  try {
    const resolved =
      typeof (params as Promise<{ id?: string }>).then === "function"
        ? await (params as Promise<{ id?: string }>)
        : (params as { id?: string });
    return String(resolved?.id || "").trim();
  } catch {
    return "";
  }
}

export default async function CompanyOpenGraphImage(props: Props) {
  const id = await resolveId(props.params);

  let name = "Company profile";
  let location = "";

  if (id) {
    try {
      const company = await db.company.findUnique({
        where: { id },
        select: { name: true, location: true, status: true },
      });
      if (company && company.status === "active") {
        name = truncate(company.name, 70);
        location =
          normalizeLocation(company.location) || company.location || "";
      }
    } catch {
      /* keep fallback */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          padding: "52px 60px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <span style={{ color: "#67e8f9", fontSize: 22, fontWeight: 700 }}>
          Global Job Matching
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              color: "#94a3b8",
              fontSize: 20,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Employer profile
          </div>
          <div
            style={{
              color: "#f8fafc",
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: 1000,
            }}
          >
            {name}
          </div>
          {location ? (
            <div style={{ color: "#cbd5e1", fontSize: 26 }}>{location}</div>
          ) : null}
        </div>

        <span style={{ color: "#67e8f9", fontSize: 20 }}>
          View open roles · global-job-matching.vercel.app
        </span>
      </div>
    ),
    { ...OG_SIZE }
  );
}
