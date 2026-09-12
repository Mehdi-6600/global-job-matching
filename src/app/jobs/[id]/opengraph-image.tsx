import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { normalizeLocation } from "@/lib/location";
import { OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-size";

export const runtime = "nodejs";
export const alt = "Job on Global Job Matching";
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

export default async function JobOpenGraphImage(props: Props) {
  const id = await resolveId(props.params);

  let title = "Job opportunity";
  let company = "Global Job Matching";
  let location = "";
  let remote = false;

  if (id) {
    try {
      const job = await db.job.findUnique({
        where: { id },
        select: {
          title: true,
          location: true,
          remote: true,
          status: true,
          company: { select: { name: true } },
        },
      });
      if (job && job.status === "active") {
        title = truncate(job.title, 80);
        company = job.company?.name || company;
        location = normalizeLocation(job.location) || job.location || "";
        remote = !!job.remote;
      }
    } catch {
      /* keep fallback */
    }
  }

  const metaLine = [company, remote ? "Remote" : null, location || null]
    .filter(Boolean)
    .join(" · ");

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
            "linear-gradient(145deg, #0f172a 0%, #164e63 55%, #0f172a 100%)",
          padding: "52px 60px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#67e8f9", fontSize: 22, fontWeight: 700 }}>
            Global Job Matching
          </span>
          <span
            style={{
              color: "#e2e8f0",
              fontSize: 18,
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(34,211,238,0.15)",
              border: "1px solid rgba(103,232,249,0.4)",
            }}
          >
            Open role
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              color: "#f8fafc",
              fontSize: title.length > 50 ? 42 : 52,
              fontWeight: 800,
              lineHeight: 1.2,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 26, maxWidth: 980 }}>
            {metaLine}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: 20 }}>
            Apply on Global Job Matching
          </span>
          <span style={{ color: "#67e8f9", fontSize: 20 }}>
            global-job-matching.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
