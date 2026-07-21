export interface JobWithCompanyName {
  id: string;
  title: string;
  location: string;
  description: string;
  company: { name: string };
}

export interface JobDto {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
}

export const JOB_WITH_COMPANY_NAME_INCLUDE = {
  company: { select: { name: true } },
} as const;
