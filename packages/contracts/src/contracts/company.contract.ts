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
            id: z.uuid(),
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
  .output(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      createdAt: z.coerce.date(),
      users: z.array(
        z.object({
          role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
          user: z.object({
            id: z.string(),
            name: z.string().nullable(),
            email: z.string(),
          }),
        }),
      ),
    }),
  );

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

  const inviteMemberContract = oc
    .route({
      method: "POST",
      path: "/company/:id/members",
    })
    .input(
      z.object({
        id: z.uuid(),
        email: z.email(),
        role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
      }),
    )
    .output(z.string());

  const changeMemberRoleContract = oc
    .route({
      method: "PATCH",
      path: "/company/:id/members/:userId",
    })
    .input(
      z.object({
        id: z.uuid(),
        userId: z.uuid(),
        role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
      }),
    )
    .output(z.string());

  const removeMemberContract = oc
    .route({
      method: "DELETE",
      path: "/company/:id/members/:userId",
    })
    .input(
      z.object({
        id: z.uuid(),
        userId: z.uuid(),
      }),
    )
    .output(z.string());

  const listMembersContract = oc
    .route({
      method: "GET",
      path: "/company/:id/members",
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
  inviteMember: inviteMemberContract,
  changeMemberRole: changeMemberRoleContract,
  removeMember: removeMemberContract,
  listMembers: listMembersContract,
};