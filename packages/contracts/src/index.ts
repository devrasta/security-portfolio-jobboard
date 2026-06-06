import { populateContractRouterPaths } from "@orpc/contract";
import { JobContract } from "./contracts/jobContract.js";

export const contract = populateContractRouterPaths({
    job: JobContract
});

export type Contract = typeof contract;