import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EMPLOYER: "EMPLOYER",
  JOB_SEEKER: "JOB_SEEKER",
};

async function main() {
  const adminPass = await bcrypt.hash("admin123", 12);
  const employerPass = await bcrypt.hash("employer123", 12);
  const seekerPass = await bcrypt.hash("seeker123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@globaljobmatching.com" },
    update: { role: ROLES.ADMIN },
    create: {
      email: "admin@globaljobmatching.com",
      name: "Admin User",
      password: adminPass,
      role: ROLES.ADMIN,
      emailVerified: new Date(),
    },
  });

  const employer = await prisma.user.upsert({
    where: { email: "employer@globaljobmatching.com" },
    update: { role: ROLES.EMPLOYER },
    create: {
      email: "employer@globaljobmatching.com",
      name: "Employer User",
      password: employerPass,
      role: ROLES.EMPLOYER,
      emailVerified: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "jobseeker@globaljobmatching.com" },
    update: { role: ROLES.JOB_SEEKER },
    create: {
      email: "jobseeker@globaljobmatching.com",
      name: "Job Seeker",
      password: seekerPass,
      role: ROLES.JOB_SEEKER,
      emailVerified: new Date(),
    },
  });

  // شرکت‌ها
  const companyData = [
    {
      name: "NovaTech Labs",
      slug: "novatech-labs",
      description: "Building next-gen cloud and AI products for global teams.",
      location: "Berlin, Germany",
      website: "https://example.com/novatech",
      status: "active",
    },
    {
      name: "Horizon Finance",
      slug: "horizon-finance",
      description: "Fintech platform for modern banking and payments.",
      location: "London, UK",
      website: "https://example.com/horizon",
      status: "active",
    },
    {
      name: "GreenLeaf Remote",
      slug: "greenleaf-remote",
      description: "Fully remote product studio focused on sustainability.",
      location: "Remote",
      website: "https://example.com/greenleaf",
      status: "active",
    },
  ];

  const companies = [];
  for (const c of companyData) {
    const company = await prisma.company.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        location: c.location,
        website: c.website,
        status: c.status,
        ownerId: employer.id,
        email: employer.email,
      },
      create: {
        ...c,
        ownerId: employer.id,
        email: employer.email,
      },
    });
    companies.push(company);
  }

  // شغل‌ها (فقط اگر خالی باشد اضافه می‌کنیم تا تکراری نشود)
  const jobCount = await prisma.job.count();
  if (jobCount === 0) {
    const jobs = [
      {
        title: "Senior Frontend Engineer",
        description:
          "Build delightful UI with React and TypeScript. Work with design and product on a global SaaS platform.",
        location: "Berlin, Germany",
        salary: "€70k–€95k",
        type: "full-time",
        remote: true,
        experience: "Senior",
        salaryMin: 70000,
        salaryMax: 95000,
        currency: "EUR",
        requirements: ["React", "TypeScript", "Next.js", "5+ years experience"],
        responsibilities: [
          "Ship production features",
          "Improve performance",
          "Mentor juniors",
        ],
        benefits: ["Remote-friendly", "Health insurance", "Learning budget"],
        tags: ["react", "frontend", "typescript"],
        status: "active",
        companyId: companies[0].id,
        postedById: employer.id,
      },
      {
        title: "Backend Engineer (Node.js)",
        description:
          "Design and scale APIs and data pipelines for a fast-growing fintech product.",
        location: "London, UK",
        salary: "£65k–£85k",
        type: "full-time",
        remote: false,
        experience: "Mid-Senior",
        salaryMin: 65000,
        salaryMax: 85000,
        currency: "GBP",
        requirements: ["Node.js", "PostgreSQL", "AWS", "3+ years experience"],
        responsibilities: [
          "Build REST/GraphQL APIs",
          "Own reliability",
          "Collaborate with security",
        ],
        benefits: ["Hybrid office", "Bonus", "Pension"],
        tags: ["nodejs", "backend", "fintech"],
        status: "active",
        companyId: companies[1].id,
        postedById: employer.id,
      },
      {
        title: "Product Designer",
        description:
          "Own end-to-end product design for a remote-first sustainability platform.",
        location: "Remote",
        salary: "$60k–$80k",
        type: "full-time",
        remote: true,
        experience: "Mid",
        salaryMin: 60000,
        salaryMax: 80000,
        currency: "USD",
        requirements: ["Figma", "UI/UX", "Design systems", "Portfolio"],
        responsibilities: [
          "Design flows and components",
          "Run user research",
          "Partner with engineering",
        ],
        benefits: ["100% remote", "Flexible hours", "Equipment stipend"],
        tags: ["design", "figma", "remote"],
        status: "active",
        companyId: companies[2].id,
        postedById: employer.id,
      },
      {
        title: "Full-Stack Developer",
        description:
          "Ship features across the stack using Next.js, Prisma, and PostgreSQL.",
        location: "Remote (EU)",
        salary: "€55k–€75k",
        type: "full-time",
        remote: true,
        experience: "Mid",
        salaryMin: 55000,
        salaryMax: 75000,
        currency: "EUR",
        requirements: ["Next.js", "Prisma", "PostgreSQL", "TypeScript"],
        responsibilities: [
          "Implement product features",
          "Write tests",
          "Improve DX",
        ],
        benefits: ["Remote EU", "PTO", "Conference budget"],
        tags: ["fullstack", "nextjs", "prisma"],
        status: "active",
        companyId: companies[0].id,
        postedById: employer.id,
      },
      {
        title: "DevOps Engineer",
        description:
          "Own CI/CD, observability, and cloud infrastructure for a fintech stack.",
        location: "London, UK",
        salary: "£70k–£90k",
        type: "full-time",
        remote: true,
        experience: "Senior",
        salaryMin: 70000,
        salaryMax: 90000,
        currency: "GBP",
        requirements: ["Kubernetes", "Terraform", "AWS", "CI/CD"],
        responsibilities: [
          "Automate deployments",
          "Monitor systems",
          "Reduce incident time",
        ],
        benefits: ["Remote-friendly", "On-call bonus", "Training"],
        tags: ["devops", "aws", "kubernetes"],
        status: "active",
        companyId: companies[1].id,
        postedById: employer.id,
      },
    ];

    for (const job of jobs) {
      await prisma.job.create({ data: job });
    }
    console.log(`Created ${jobs.length} jobs`);
  } else {
    console.log(`Jobs already exist (${jobCount}), skipping job seed`);
  }

  console.log("Seed completed");
  console.log("Accounts:");
  console.log("  admin@globaljobmatching.com / admin123");
  console.log("  employer@globaljobmatching.com / employer123");
  console.log("  jobseeker@globaljobmatching.com / seeker123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
