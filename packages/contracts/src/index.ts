import { populateContractRouterPaths } from "@orpc/contract";
import { JobContract } from "./contracts/jobContract.js";
import { CompanyContract } from "./contracts/company.contract.js";

export const contract = populateContractRouterPaths({
  job: JobContract,
  company: CompanyContract,
});

export type Contract = typeof contract;