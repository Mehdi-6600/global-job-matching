import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const ownerEmail = process.env.OWNER_EMAIL || "admin@example.com";
    let existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    let ownerId: string;
    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          name: "Owner",
          email: ownerEmail,
          password: await bcrypt.hash("ChangeMe123!", 12),
          role: "admin",
        },
      });
      ownerId = user.id;
    } else {
      ownerId = existingUser.id;
    }

    const company = await prisma.company.upsert({
      where: { slug: "techcorp" },
      update: {},
      create: {
        name: "TechCorp",
        slug: "techcorp",
        email: "hello@techcorp.io",
        location: "Berlin, Germany",
        status: "verified",
      },
    });

    const jobs = [
      {
        title: "Senior React Developer",
        description: "We're looking for a Senior React Developer to join our remote team.",
        requirements: ["5+ years of React experience", "TypeScript", "Next.js", "Tailwind CSS"],
        responsibilities: ["Develop frontend features", "Code review", "Mentor juniors"],
        benefits: ["Remote work", "Flexible hours", "Stock options"],
        tags: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
        type: "full-time",
        experience: "senior",
        location: "Berlin, Germany",
        remote: true,
        salaryMin: 85000,
        salaryMax: 115000,
        currency: "EUR",
        status: "active",
        companyId: company.id,
      },
      {
        title: "Full Stack Engineer",
        description: "Join our fast-growing startup as a Full Stack Engineer.",
        requirements: ["3+ years of experience", "Node.js", "React", "PostgreSQL", "AWS"],
        responsibilities: ["Full stack development", "Database design", "API development"],
        benefits: ["Health insurance", "Remote work", "Learning budget"],
        tags: ["Node.js", "React", "PostgreSQL", "AWS"],
        type: "full-time",
        experience: "mid",
        location: "Remote",
        remote: true,
        salaryMin: 70000,
        salaryMax: 95000,
        currency: "EUR",
        status: "active",
        companyId: company.id,
      },
      {
        title: "DevOps Engineer",
        description: "We need a DevOps Engineer to manage our cloud infrastructure.",
        requirements: ["4+ years of DevOps experience", "Kubernetes", "Docker", "AWS"],
        responsibilities: ["CI/CD pipelines", "Infrastructure management", "Monitoring"],
        benefits: ["Remote work", "Conference budget", "Team events"],
        tags: ["Kubernetes", "Docker", "AWS", "Terraform"],
        type: "full-time",
        experience: "senior",
        location: "London, UK",
        remote: false,
        salaryMin: 90000,
        salaryMax: 120000,
        currency: "GBP",
        status: "active",
        companyId: company.id,
      },
    ];

    let createdCount = 0;
    for (const job of jobs) {
      await prisma.job.create({
        data: job as any,
      });
      createdCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${createdCount} jobs seeded successfully!`,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: error.message },
      { status: 500 }
    );
  }
}
