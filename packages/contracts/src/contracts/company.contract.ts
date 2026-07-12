import { oc } from "@orpc/contract";
import * as z from "zod";

export const createCompanyContract = oc
  .route({
    method: "POST",
    path: "/company",
  })
  .input(
    z.object({
      name: z.string(),
      description: z.optional(z.string()),
      users: z.optional(
        z.array(
          z.object({
            email: z.uuid(),
          }),
        ),
      ),
    }),
  )
  .output(z.string());

  const getCompanyContract = oc
  .route({
    method: "GET",
    path: "/company/:id",
  })
  .input(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .output(z.string());

  const deleteCompanyContract = oc
  .route({
    method: "DELETE",
    path: "/company/:id",
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(z.string());

export const CompanyContract = {
    create: createCompanyContract,
    get: getCompanyContract,
    delete: deleteCompanyContract,
};