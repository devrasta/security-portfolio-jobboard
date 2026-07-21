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

export const JobContract = {
  create: createJobContract,
  get: getJobsContract,
  getById: getJobContract,
  update: updateJobContract,
  delete: deleteJobContract,
};