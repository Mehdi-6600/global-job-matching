import type { Metadata } from "next";
import { db } from "@/lib/db";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "https://global-job-matching.vercel.app";

  try {
    const job = await db.job.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        location: true,
        remote: true,
        status: true,
        company: { select: { name: true, logo: true } },
      },
    });

    if (!job || job.status !== "active") {
      return {
        title: "Job not found | Global Job Matching",
        robots: { index: false, follow: false },
      };
    }

    const company = job.company?.name || "Company";
    const loc = job.remote ? "Remote" : job.location;
    const title = `${job.title} at ${company} | Global Job Matching`;
    const description = (job.description || `${job.title} — ${company}, ${loc}`)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    const url = `${base.replace(/\/$/, "")}/jobs/${id}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: "website",
        siteName: "Global Job Matching",
        images: job.company?.logo
          ? [{ url: job.company.logo }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Job | Global Job Matching",
      description: "View job details on Global Job Matching",
    };
  }
}

export default function JobDetailLayout({ children }: Props) {
  return children;
}
