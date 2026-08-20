import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ایجاد کاربر ادمین (اگه وجود نداره)
  const ownerEmail = process.env.OWNER_EMAIL || "admin@example.com";
  const existingUser = await prisma.user.findUnique({
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
    console.log("✅ Owner user created");
  } else {
    ownerId = existingUser.id;
    console.log("✅ Owner already exists");
  }

  // مشاغل واقعی
  const jobs = [
    {
      title: "Senior React Developer",
      description: "We're looking for a Senior React Developer to join our remote team. You'll be building modern web applications using React, TypeScript, and Next.js.",
      requirements: "5+ years of React experience, TypeScript, Next.js, Tailwind CSS, and experience with REST APIs.",
      skillsRequired: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
      jobType: "FULL_TIME",
      country: "Germany",
      city: "Berlin",
      isRemote: true,
      salaryMin: 85000,
      salaryMax: 115000,
      salaryCurrency: "EUR",
      salaryPeriod: "yearly",
      contactName: "Sarah Johnson",
      contactEmail: "sarah@techcorp.io",
      status: "ACTIVE",
      source: "direct",
    },
    {
      title: "Full Stack Engineer",
      description: "Join our fast-growing startup as a Full Stack Engineer. You'll work on both frontend and backend, building features that impact thousands of users.",
      requirements: "3+ years of experience, Node.js, React, PostgreSQL, and AWS.",
      skillsRequired: ["Node.js", "React", "PostgreSQL", "AWS"],
      jobType: "FULL_TIME",
      country: "Germany",
      city: "Remote",
      isRemote: true,
      salaryMin: 70000,
      salaryMax: 95000,
      salaryCurrency: "EUR",
      salaryPeriod: "yearly",
      contactName: "Michael Chen",
      contactEmail: "michael@startup.io",
      status: "ACTIVE",
      source: "direct",
    },
    {
      title: "DevOps Engineer",
      description: "We need a DevOps Engineer to manage our cloud infrastructure, CI/CD pipelines, and ensure high availability of our services.",
      requirements: "4+ years of DevOps experience, Kubernetes, Docker, AWS, and Terraform.",
      skillsRequired: ["Kubernetes", "Docker", "AWS", "Terraform"],
      jobType: "FULL_TIME",
      country: "United Kingdom",
      city: "London",
      isRemote: false,
      salaryMin: 90000,
      salaryMax: 120000,
      salaryCurrency: "GBP",
      salaryPeriod: "yearly",
      contactName: "Emma Wilson",
      contactEmail: "emma@cloudsolutions.co.uk",
      status: "ACTIVE",
      source: "direct",
    },
    {
      title: "UI/UX Designer",
      description: "Looking for a talented UI/UX Designer to create beautiful and intuitive interfaces. You'll work closely with product and engineering teams.",
      requirements: "3+ years of experience, Figma, Adobe Creative Suite, and a strong portfolio.",
      skillsRequired: ["Figma", "Adobe XD", "UI Design", "UX Research"],
      jobType: "FULL_TIME",
      country: "United States",
      city: "New York",
      isRemote: true,
      salaryMin: 80000,
      salaryMax: 110000,
      salaryCurrency: "USD",
      salaryPeriod: "yearly",
      contactName: "David Park",
      contactEmail: "david@designstudio.com",
      status: "ACTIVE",
      source: "direct",
    },
    {
      title: "Data Analyst",
      description: "We're seeking a Data Analyst to help us make data-driven decisions. You'll analyze large datasets and create meaningful reports.",
      requirements: "2+ years of experience, SQL, Python, and data visualization tools (Tableau, Power BI).",
      skillsRequired: ["SQL", "Python", "Tableau", "Power BI"],
      jobType: "FULL_TIME",
      country: "Germany",
      city: "Munich",
      isRemote: false,
      salaryMin: 60000,
      salaryMax: 80000,
      salaryCurrency: "EUR",
      salaryPeriod: "yearly",
      contactName: "Anna Schmidt",
      contactEmail: "anna@datatech.de",
      status: "ACTIVE",
      source: "direct",
    },
  ];

  for (const job of jobs) {
    await prisma.jobListing.create({
      data: {
        ...job,
        employerId: ownerId,
      },
    });
  }

  console.log(`✅ ${jobs.length} jobs created successfully!`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
