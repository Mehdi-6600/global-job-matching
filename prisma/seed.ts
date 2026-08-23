import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.savedJob.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  await prisma.company.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Technology", slug: "technology", color: "bg-cyan-500" } }),
    prisma.category.create({ data: { name: "Design", slug: "design", color: "bg-purple-500" } }),
    prisma.category.create({ data: { name: "Marketing", slug: "marketing", color: "bg-pink-500" } }),
    prisma.category.create({ data: { name: "Finance", slug: "finance", color: "bg-emerald-500" } }),
    prisma.category.create({ data: { name: "Healthcare", slug: "healthcare", color: "bg-red-500" } }),
    prisma.category.create({ data: { name: "Sales", slug: "sales", color: "bg-blue-500" } }),
    prisma.category.create({ data: { name: "HR", slug: "hr", color: "bg-teal-500" } }),
  ]);

  // Create companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: "TechCorp",
        slug: "techcorp",
        email: "careers@techcorp.com",
        website: "techcorp.com",
        location: "San Francisco, CA",
        size: "50-200 employees",
        description: "Leading technology company focused on web solutions.",
        logo: "TC",
        status: "verified",
      },
    }),
    prisma.company.create({
      data: {
        name: "CloudScale",
        slug: "cloudscale",
        email: "jobs@cloudscale.io",
        website: "cloudscale.io",
        location: "London, UK",
        size: "200-500 employees",
        description: "Cloud infrastructure and scaling solutions.",
        logo: "CS",
        status: "verified",
      },
    }),
    prisma.company.create({
      data: {
        name: "Creative Studio",
        slug: "creative-studio",
        email: "team@creative.studio",
        website: "creative.studio",
        location: "Paris, France",
        size: "10-50 employees",
        description: "Award-winning design studio.",
        logo: "CR",
        status: "verified",
      },
    }),
    prisma.company.create({
      data: {
        name: "DataFlow",
        slug: "dataflow",
        email: "hello@dataflow.ai",
        website: "dataflow.ai",
        location: "Berlin, Germany",
        size: "10-50 employees",
        description: "AI and data analytics platform.",
        logo: "DF",
        status: "pending",
      },
    }),
  ]);

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "john@example.com",
        password: hashedPassword,
        name: "John Doe",
        title: "Senior Frontend Developer",
        phone: "+1 234 567 890",
        location: "San Francisco, USA",
        bio: "Full-stack developer with 5 years of experience.",
        role: "jobseeker",
      },
    }),
    prisma.user.create({
      data: {
        email: "sarah@techcorp.com",
        password: hashedPassword,
        name: "Sarah Smith",
        title: "HR Manager",
        role: "employer",
      },
    }),
    prisma.user.create({
      data: {
        email: "admin@globaljob.com",
        password: hashedPassword,
        name: "Admin User",
        role: "admin",
      },
    }),
  ]);

  // Create jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: "Senior Frontend Developer",
        description: "We are looking for an experienced Frontend Developer to join our growing team.",
        location: "Remote",
        remote: true,
        type: "full-time",
        experience: "senior",
        salaryMin: 120000,
        salaryMax: 150000,
        currency: "USD",
        requirements: ["3+ years React", "TypeScript", "Next.js"],
        responsibilities: ["Build UI", "Code review", "Mentor juniors"],
        benefits: ["Health insurance", "Remote work", "Stock options"],
        tags: ["React", "TypeScript", "Next.js"],
        companyId: companies[0].id,
        categoryId: categories[0].id,
        status: "active",
      },
    }),
    prisma.job.create({
      data: {
        title: "Backend Engineer",
        description: "Build scalable backend systems using Node.js and PostgreSQL.",
        location: "London, UK",
        remote: false,
        type: "full-time",
        experience: "mid",
        salaryMin: 80000,
        salaryMax: 100000,
        currency: "GBP",
        requirements: ["Node.js", "PostgreSQL", "AWS"],
        responsibilities: ["API development", "Database design", "Performance optimization"],
        benefits: ["Pension", "Flexible hours", "Learning budget"],
        tags: ["Node.js", "PostgreSQL", "AWS"],
        companyId: companies[1].id,
        categoryId: categories[0].id,
        status: "active",
      },
    }),
    prisma.job.create({
      data: {
        title: "Product Designer",
        description: "Design beautiful and functional user interfaces.",
        location: "Paris, France",
        remote: true,
        type: "contract",
        experience: "mid",
        salaryMin: 60000,
        salaryMax: 80000,
        currency: "EUR",
        requirements: ["Figma", "UI/UX", "Design Systems"],
        responsibilities: ["Wireframing", "Prototyping", "User research"],
        benefits: ["Remote work", "Equipment budget"],
        tags: ["Figma", "UI/UX", "Design Systems"],
        companyId: companies[2].id,
        categoryId: categories[1].id,
        status: "active",
      },
    }),
    prisma.job.create({
      data: {
        title: "DevOps Engineer",
        description: "Manage cloud infrastructure and CI/CD pipelines.",
        location: "Berlin, Germany",
        remote: false,
        type: "full-time",
        experience: "senior",
        salaryMin: 90000,
        salaryMax: 110000,
        currency: "EUR",
        requirements: ["Docker", "Kubernetes", "CI/CD"],
        responsibilities: ["Infrastructure", "Automation", "Monitoring"],
        benefits: ["Health insurance", "Remote days", "Conference budget"],
        tags: ["Docker", "Kubernetes", "CI/CD"],
        companyId: companies[3].id,
        categoryId: categories[0].id,
        status: "active",
      },
    }),
    prisma.job.create({
      data: {
        title: "Marketing Manager",
        description: "Lead marketing campaigns and growth strategies.",
        location: "Remote",
        remote: true,
        type: "full-time",
        experience: "lead",
        salaryMin: 70000,
        salaryMax: 90000,
        currency: "USD",
        requirements: ["SEO", "Content strategy", "Analytics"],
        responsibilities: ["Campaign planning", "Team management", "Budget allocation"],
        benefits: ["Remote work", "Performance bonus"],
        tags: ["SEO", "Content", "Analytics"],
        companyId: companies[0].id,
        categoryId: categories[2].id,
        status: "active",
      },
    }),
  ]);

  // Create applications
  await prisma.application.create({
    data: {
      status: "interview",
      userId: users[0].id,
      jobId: jobs[0].id,
    },
  });

  await prisma.application.create({
    data: {
      status: "viewed",
      userId: users[0].id,
      jobId: jobs[1].id,
    },
  });

  // Create saved jobs
  await prisma.savedJob.create({
    data: {
      userId: users[0].id,
      jobId: jobs[0].id,
    },
  });

  // Create notifications
  await prisma.notification.create({
    data: {
      type: "interview",
      title: "Interview Scheduled",
      description: "TechCorp invited you for an interview.",
      userId: users[0].id,
      actionUrl: "/my-applications",
    },
  });

  await prisma.notification.create({
    data: {
      type: "application",
      title: "Application Viewed",
      description: "CloudScale viewed your application.",
      userId: users[0].id,
      actionUrl: "/my-applications",
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
