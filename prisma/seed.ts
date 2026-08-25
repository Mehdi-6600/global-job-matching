import { PrismaClient } from "@prisma/client";
import { ROLES } from "@/lib/roles";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 12);
  const employerPass = await bcrypt.hash("employer123", 12);
  const seekerPass = await bcrypt.hash("seeker123", 12);

  await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  console.log("Seed completed with standardized roles");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
