import { oc } from "@orpc/contract";
import { z } from "zod";

export const JobContract = oc.route({
    method: "GET",
    path: "/jobs"
}).input(z.object({
    search: z.string().optional(),
    location: z.string().optional(),
    company: z.string().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional()
})).output(z.array(z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string(),
    description: z.string()
})));