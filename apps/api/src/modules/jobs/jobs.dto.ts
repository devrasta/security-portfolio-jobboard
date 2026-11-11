export interface JobWithCompanyName {
  id: string;
  title: string;
  location: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  company: { name: string };
}

export interface JobDto {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface CreateJobDto {
  companyId: string;
  title: string;
  location: string;
  description: string;
  currentUserId: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
export interface UpdateJobDto {
  jobId: string;
  title?: string;
  location?: string;
  description?: string;
  ownerId?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export const JOB_WITH_COMPANY_NAME_INCLUDE = {
  company: { select: { name: true } },
} as const;
