import { oc } from "@orpc/contract";
import * as z from "zod";

export const createCompanyContract = oc
  .route({
    method: "POST",
    path: "/companies",
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
      path: "/companies/:companyId",
    })
    .input(
      z.object({
        companyId: z.string().uuid(),
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

  const listCompaniesContract = oc
    .route({
      method: "GET",
      path: "/companies",
    })
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
          role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
          createdAt: z.coerce.date(),
        }),
      ),
    );

  const deleteCompanyContract = oc
    .route({
      method: "DELETE",
      path: "/companies/:companyId",
    })
    .input(
      z.object({
        companyId: z.uuid(),
      }),
    )
    .output(z.string());

  const inviteMemberContract = oc
    .route({
      method: "POST",
      path: "/companies/:companyId/members/invite",
    })
    .input(
      z.object({
        companyId: z.uuid(),
        email: z.email(),
        role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
      }),
    )
    .output(z.string());

  const changeMemberRoleContract = oc
    .route({
      method: "PATCH",
      path: "/companies/:companyId/members/:userId",
    })
    .input(
      z.object({
        companyId: z.uuid(),
        userId: z.uuid(),
        role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
      }),
    )
    .output(z.string());

  const removeMemberContract = oc
    .route({
      method: "DELETE",
      path: "/companies/:companyId/members/:userId",
    })
    .input(
      z.object({
        companyId: z.uuid(),
        userId: z.uuid(),
      }),
    )
    .output(z.string());

  const listMembersContract = oc
    .route({
      method: "GET",
      path: "/companies/:companyId/members",
    })
    .input(
      z.object({
        companyId: z.uuid(),
      }),
    )
    .output(
      z.array(
        z.object({
          userId: z.string(),
          email: z.string(),
          role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
        }),
      ),
    );

export const CompanyContract = {
  create: createCompanyContract,
  get: getCompanyContract,
  list: listCompaniesContract,
  delete: deleteCompanyContract,
  inviteMember: inviteMemberContract,
  changeMemberRole: changeMemberRoleContract,
  removeMember: removeMemberContract,
  listMembers: listMembersContract,
};