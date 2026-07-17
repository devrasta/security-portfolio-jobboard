import { populateContractRouterPaths } from "@orpc/contract";
import { JobContract } from "./contracts/jobContract.js";
import { CompanyContract } from "./contracts/company.contract.js";

export const contract = populateContractRouterPaths({
  job: JobContract,
  companies: CompanyContract,
});

export type Contract = typeof contract;