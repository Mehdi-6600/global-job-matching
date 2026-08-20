import { NextResponse } from "next/server";
import { PrismaClient, JobType, ListingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. ایجاد کاربر ادمین
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
          role: "OWNER",
          emailVerified: new Date(),
        },
      });
      ownerId = user.id;
    } else {
      ownerId = existingUser.id;
    }

    // 2. مشاغل واقعی
    const jobs = [
      {
        title: "Senior React Developer",
        description: "We're looking for a Senior React Developer to join our remote team.",
        requirements: "5+ years of React experience, TypeScript, Next.js, Tailwind CSS.",
        skillsRequired: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
        jobType: "FULL_TIME" as JobType,
        country: "Germany",
        city: "Berlin",
        isRemote: true,
        salaryMin: 85000,
        salaryMax: 115000,
        salaryCurrency: "EUR",
        salaryPeriod: "yearly",
        contactName: "Sarah Johnson",
        contactEmail: "sarah@techcorp.io",
        status: "ACTIVE" as ListingStatus,
        source: "direct",
        employerId: ownerId,
      },
      {
        title: "Full Stack Engineer",
        description: "Join our fast-growing startup as a Full Stack Engineer.",
        requirements: "3+ years of experience, Node.js, React, PostgreSQL, and AWS.",
        skillsRequired: ["Node.js", "React", "PostgreSQL", "AWS"],
        jobType: "FULL_TIME" as JobType,
        country: "Germany",
        city: "Remote",
        isRemote: true,
        salaryMin: 70000,
        salaryMax: 95000,
        salaryCurrency: "EUR",
        salaryPeriod: "yearly",
        contactName: "Michael Chen",
        contactEmail: "michael@startup.io",
        status: "ACTIVE" as ListingStatus,
        source: "direct",
        employerId: ownerId,
      },
      {
        title: "DevOps Engineer",
        description: "We need a DevOps Engineer to manage our cloud infrastructure.",
        requirements: "4+ years of DevOps experience, Kubernetes, Docker, AWS.",
        skillsRequired: ["Kubernetes", "Docker", "AWS", "Terraform"],
        jobType: "FULL_TIME" as JobType,
        country: "United Kingdom",
        city: "London",
        isRemote: false,
        salaryMin: 90000,
        salaryMax: 120000,
        salaryCurrency: "GBP",
        salaryPeriod: "yearly",
        contactName: "Emma Wilson",
        contactEmail: "emma@cloudsolutions.co.uk",
        status: "ACTIVE" as ListingStatus,
        source: "direct",
        employerId: ownerId,
      },
    ];

    let createdCount = 0;
    for (const job of jobs) {
      await prisma.jobListing.create({
        data: job,
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
