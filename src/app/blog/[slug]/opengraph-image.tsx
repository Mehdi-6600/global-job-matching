import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-size";

export const runtime = "nodejs";
export const alt = "Blog on Global Job Matching";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params?: Promise<{ slug?: string }> | { slug?: string };
};

function truncate(s: string, n: number) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

async function resolveSlug(params: Props["params"]): Promise<string> {
  if (!params) return "";
  try {
    const resolved =
      typeof (params as Promise<{ slug?: string }>).then === "function"
        ? await (params as Promise<{ slug?: string }>)
        : (params as { slug?: string });
    return String(resolved?.slug || "").trim();
  } catch {
    return "";
  }
}

export default async function BlogOpenGraphImage(props: Props) {
  const slug = await resolveSlug(props.params);

  let title = "Career insights";
  let excerpt = "Global Job Matching blog";

  if (slug) {
    try {
      const post = await prisma.blogPost.findUnique({
        where: { slug, published: true },
        select: { title: true, excerpt: true },
      });
      if (post) {
        title = truncate(post.title, 90);
        if (post.excerpt) excerpt = truncate(post.excerpt, 120);
      }
    } catch {
      /* fallback brand card */
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
            "linear-gradient(145deg, #0f172a 0%, #312e81 45%, #0f172a 100%)",
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
          <span style={{ color: "#a5b4fc", fontSize: 22, fontWeight: 700 }}>
            Global Job Matching
          </span>
          <span
            style={{
              color: "#e0e7ff",
              fontSize: 18,
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(129,140,248,0.2)",
              border: "1px solid rgba(165,180,252,0.45)",
            }}
          >
            Blog
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              color: "#f8fafc",
              fontSize: title.length > 55 ? 40 : 48,
              fontWeight: 800,
              lineHeight: 1.2,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
          <div style={{ color: "#c7d2fe", fontSize: 24, maxWidth: 960 }}>
            {excerpt}
          </div>
        </div>

        <span style={{ color: "#a5b4fc", fontSize: 20 }}>
          global-job-matching.vercel.app/blog
        </span>
      </div>
    ),
    { ...OG_SIZE }
  );
}
