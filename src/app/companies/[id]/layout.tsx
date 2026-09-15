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
    const company = await db.company.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        location: true,
        logo: true,
        status: true,
      },
    });

    if (!company || (company.status && company.status !== "active")) {
      return {
        title: "Company not found | Global Job Matching",
        robots: { index: false, follow: false },
      };
    }

    const title = `${company.name} | Global Job Matching`;
    const description = (
      company.description ||
      `${company.name}${company.location ? ` — ${company.location}` : ""} — hiring on Global Job Matching`
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    const url = `${base.replace(/\/$/, "")}/companies/${id}`;

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
        images: company.logo ? [{ url: company.logo }] : undefined,
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Company | Global Job Matching",
      description: "Company profile on Global Job Matching",
    };
  }
}

export default function CompanyDetailLayout({ children }: Props) {
  return children;
}
