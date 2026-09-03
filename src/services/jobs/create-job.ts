import { prisma } from "@/lib/prisma";
import { JobStatus, Role } from "@prisma/client";

export interface CreateJobInput {
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  location: string;
  type: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  skills: string[];
  companyName: string;
  companyLogo?: string;
  companyWebsite?: string;
}

export interface CreateJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
  statusCode: number;
}

export async function createJobForUser(
  userId: string,
  input: CreateJobInput
): Promise<CreateJobResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch user status and subscription plan within transaction
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          plan: true,
          companies: {
            select: { id: true, name: true },
            take: 1,
          },
        },
      });

      if (!user) {
        return { success: false, error: "USER_NOT_FOUND", statusCode: 404 };
      }

      if (user.role !== Role.EMPLOYER && user.role !== Role.ADMIN) {
        return {
          success: false,
          error: "FORBIDDEN_EMPLOYER_ROLE_REQUIRED",
          statusCode: 403,
        };
      }

      // 2. Determine active job limit based on subscription plan
      let maxAllowedJobs = 1;
      const planUpper = (user.plan || "FREE").toUpperCase();

      if (planUpper === "PRO") {
        maxAllowedJobs = 10;
      } else if (planUpper === "ENTERPRISE") {
        maxAllowedJobs = 100;
      }

      // 3. Count active jobs atomically
      const activeJobsCount = await tx.job.count({
        where: {
          userId: user.id,
          status: JobStatus.ACTIVE,
        },
      });

      if (activeJobsCount >= maxAllowedJobs) {
        return {
          success: false,
          error: "PLAN_LIMIT_REACHED",
          statusCode: 400,
        };
      }

      // 4. Handle idempotent company creation
      let companyId: string;

      if (user.companies.length > 0) {
        companyId = user.companies[0].id;
      } else {
        const existingCompany = await tx.company.findFirst({
          where: { ownerId: user.id },
        });

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const newCompany = await tx.company.create({
            data: {
              name: input.companyName,
              logo: input.companyLogo || null,
              website: input.companyWebsite || null,
              ownerId: user.id,
            },
          });
          companyId = newCompany.id;
        }
      }

      // 5. Create new job posting
      const newJob = await tx.job.create({
        data: {
          title: input.title,
          description: input.description,
          requirements: input.requirements || "",
          responsibilities: input.responsibilities || "",
          benefits: input.benefits || "",
          location: input.location,
          type: input.type,
          experienceLevel: input.experienceLevel,
          salaryMin: input.salaryMin || null,
          salaryMax: input.salaryMax || null,
          salaryCurrency: input.salaryCurrency || "USD",
          skills: input.skills,
          status: JobStatus.ACTIVE,
          userId: user.id,
          companyId: companyId,
        },
      });

      return {
        success: true,
        jobId: newJob.id,
        statusCode: 201,
      };
    });
  } catch (error: unknown) {
    console.error("Error in createJobForUser service:", error);
    return {
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
    };
  }
}
