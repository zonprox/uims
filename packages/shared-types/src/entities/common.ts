import type { Organization } from './organization';

export enum LocationType {
  CAMPUS = 'CAMPUS',
  SITE = 'SITE',
  BRANCH = 'BRANCH',
  BUILDING = 'BUILDING',
  WORKSHOP = 'WORKSHOP',
  WAREHOUSE = 'WAREHOUSE',
  FLOOR = 'FLOOR',
  ZONE = 'ZONE',
  LINE = 'LINE',
  AREA = 'AREA',
  ROOM = 'ROOM',
  RACK = 'RACK',
  SHELF = 'SHELF',
  STATION = 'STATION',
  BIN = 'BIN',
}

export interface LocationPathNode {
  id: string;
  name: string;
  code?: string | null;
  type?: LocationType | string | null;
}

export interface Location {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  type?: LocationType | string | null;
  status?: string;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  address?: string | null;
  parentId?: string | null;
  parent?: Location | null;
  children?: Location[];
  organizationId?: string | null;
  organization?: Organization | null;
  fullPath?: string | null;
  pathNodes?: LocationPathNode[];
  city?: string | null;
  country?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assets?: number;
    inventoryItems?: number;
    users?: number;
    children?: number;
  };
}

export interface LocationTreeNode {
  id: string;
  key: string; // Ant Design Tree compatibility
  value: string; // Ant Design TreeSelect compatibility
  title: string; // Ant Design Tree/TreeSelect compatibility
  label: string; // Ant Design Cascader compatibility
  name: string;
  code?: string | null;
  type?: LocationType | string | null;
  parentId?: string | null;
  organizationId?: string | null;
  organization?: { id: string; name: string; code: string } | null;
  fullPath: string; // e.g. "BSL - Soc Trang Campus > Factory 1 > Sewing Line 01"
  description?: string | null;
  children?: LocationTreeNode[];
  _count?: {
    assets: number;
    inventoryItems: number;
    users: number;
    children: number;
  };
}

export interface Vendor {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}
