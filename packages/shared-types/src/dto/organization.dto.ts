export interface CreateOrganizationDto {
  name: string;
  code: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  status?: string;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> {}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
  organizationId?: string;
  parentId?: string;
  managerName?: string;
  managerEmail?: string;
  status?: string;
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> {}

export interface CreatePositionDto {
  title: string;
  code: string;
  description?: string;
  departmentId?: string;
  level?: string;
  status?: string;
}

export interface UpdatePositionDto extends Partial<CreatePositionDto> {}
