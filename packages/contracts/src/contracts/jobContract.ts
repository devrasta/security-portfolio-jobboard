import { oc } from "@orpc/contract";
import * as z from "zod";

export const createJobContract = oc
  .route({
    method: "POST",
    path: "/companies/:companyId/jobs",
  })
  .input(
    z.object({
      companyId: z.uuid(),
      title: z.string().max(200),
      location: z.string().max(200),
      description: z.string().max(1000),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      description: z.string(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    }),
  );
const getJobsContract = oc
  .route({
    method: "GET",
    path: "/companies/:companyId/jobs",
  })
  .input(
    z.object({
      companyId: z.uuid(),
    }),
  )
  .output(
    z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        company: z.string(),
        location: z.string(),
        description: z.string(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
      }),
    ),
  );

const getJobContract = oc
  .route({
    method: "GET",
    path: "/companies/:companyId/jobs/:jobId",
  })
  .input(
    z.object({
      companyId: z.string(),
      jobId: z.string(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      description: z.string(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    }),
  );

const updateJobContract = oc
  .route({
    method: "PATCH",
    path: "/companies/:companyId/jobs/:jobId",
  })
  .input(
    z.object({
      companyId: z.string(),
      jobId: z.string(),
      title: z.string().max(200).optional(),
      location: z.string().max(200).optional(),
      description: z.string().max(1000).optional(),
      ownerId: z.string().optional(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      description: z.string(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    }),
  );

const deleteJobContract = oc
  .route({
    method: "DELETE",
    path: "/companies/:companyId/jobs/:jobId",
  })
  .input(
    z.object({
      companyId: z.string(),
      jobId: z.string(),
    }),
  )
  .output(
    z.string().describe("Confirmation message that the job has been deleted"),
  );

const generateJobUrlContract = oc
  .route({
    method: "POST",
    path: "/companies/:companyId/jobs/:jobId/share",
  })
  .input(
    z.object({
      companyId: z.string(),
      jobId: z.string(),
    }),
  )
  .output(z.url());
const revokeJobUrlContract = oc
  .route({
    method: "DELETE",
    path: "/companies/:companyId/jobs/:jobId/share",
  })
  .input(
    z.object({
      companyId: z.string(),
      jobId: z.string(),
    }),
  )
  .output(
    z.string().describe("Confirmation message that the share link has been revoked"),
  );

const inviteJobContract = oc
  .route({
    method: "POST",
    path: "/companies/:companyId/jobs/:jobId/invite",
  })
  .input(
    z.object({
      companyId: z.string(),
      jobId: z.string(),
      email: z.email(),
    }),
  )
  .output(
    z
      .string()
      .describe("Confirmation message that the invitation has been sent"),
  );

const sharedJobContract = oc
  .route({
    method: "GET",
    path: "/jobs/shared/:shareToken",
  })
  .input(
    z.object({
      shareToken: z.string(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      description: z.string(),
    }),
  );

const jobInviteContract = oc
  .route({
    method: "GET",
    path: "/jobs/invite/:inviteToken",
  })
  .input(
    z.object({
      inviteToken: z.string(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      description: z.string(),
    }),
  );

const publicJobContract = oc
  .route({
    method: "GET",
    path: "/jobs/public/:jobId",
  })
  .input(
    z.object({
      jobId: z.uuid(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      description: z.string(),
    }),
  );

const publicJobsListContract = oc
  .route({
    method: "GET",
    path: "/jobs/public",
  })
  .output(
    z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        company: z.string(),
        location: z.string(),
        description: z.string(),
      }),
    ),
  );

export const JobContract = {
  create: createJobContract,
  get: getJobsContract,
  getById: getJobContract,
  update: updateJobContract,
  delete: deleteJobContract,
  generateUrl: generateJobUrlContract,
  revokeUrl: revokeJobUrlContract,
  invite: inviteJobContract,
  getSharedJob: sharedJobContract,
  getJobByInvite: jobInviteContract,
  getPublicJob: publicJobContract,
  listPublicJobs: publicJobsListContract,
};