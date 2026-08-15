import type {
  CreateDepartmentDto,
  CreateOrganizationDto,
  CreatePositionDto,
  Department,
  Organization,
  OrganizationStats,
  OrgNode,
  Position,
  UpdateDepartmentDto,
  UpdateOrganizationDto,
  UpdatePositionDto,
} from '@uims/shared-types';
import { api } from './api';

export interface LocationBranch {
  id: string;
  name: string;
  code?: string;
  building?: string;
  floor?: string;
  room?: string;
  address?: string;
  type?: string;
  organizationId?: string;
  organization?: { id: string; name: string; code: string };
  _count?: { assets: number; users: number };
}

export const organizationService = {
  getStats: async (): Promise<OrganizationStats> => {
    const res = await api.get('/organizations/stats');
    return res.data.data;
  },

  getTree: async (): Promise<OrgNode[]> => {
    const res = await api.get('/organizations/tree');
    return res.data.data;
  },

  getLocations: async (): Promise<LocationBranch[]> => {
    const res = await api.get('/organizations/locations');
    return res.data.data;
  },

  getOrganizations: async (): Promise<Organization[]> => {
    const res = await api.get('/organizations');
    return res.data.data;
  },

  getOrganization: async (id: string): Promise<Organization> => {
    const res = await api.get(`/organizations/${id}`);
    return res.data.data;
  },

  createOrganization: async (data: CreateOrganizationDto): Promise<Organization> => {
    const res = await api.post('/organizations', data);
    return res.data.data;
  },

  updateOrganization: async (id: string, data: UpdateOrganizationDto): Promise<Organization> => {
    const res = await api.patch(`/organizations/${id}`, data);
    return res.data.data;
  },

  deleteOrganization: async (id: string): Promise<void> => {
    await api.delete(`/organizations/${id}`);
  },

  getDepartments: async (): Promise<Department[]> => {
    const res = await api.get('/departments');
    return res.data.data;
  },

  getDepartment: async (id: string): Promise<Department> => {
    const res = await api.get(`/departments/${id}`);
    return res.data.data;
  },

  createDepartment: async (data: CreateDepartmentDto): Promise<Department> => {
    const res = await api.post('/departments', data);
    return res.data.data;
  },

  updateDepartment: async (id: string, data: UpdateDepartmentDto): Promise<Department> => {
    const res = await api.patch(`/departments/${id}`, data);
    return res.data.data;
  },

  deleteDepartment: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },

  getPositions: async (): Promise<Position[]> => {
    const res = await api.get('/positions');
    return res.data.data;
  },

  getPosition: async (id: string): Promise<Position> => {
    const res = await api.get(`/positions/${id}`);
    return res.data.data;
  },

  createPosition: async (data: CreatePositionDto): Promise<Position> => {
    const res = await api.post('/positions', data);
    return res.data.data;
  },

  updatePosition: async (id: string, data: UpdatePositionDto): Promise<Position> => {
    const res = await api.patch(`/positions/${id}`, data);
    return res.data.data;
  },

  deletePosition: async (id: string): Promise<void> => {
    await api.delete(`/positions/${id}`);
  },
};
