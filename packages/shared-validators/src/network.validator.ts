import { IPStatus, VlanStatus } from '@uims/shared-types';
import { z } from 'zod';
import { uuidSchema } from './common.validator';

export const ipv4Regex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export const cidrRegex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2])$/;

export const macRegex =
  /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}$|^[0-9A-Fa-f]{12}$/;

// --- VLAN Schemas ---

export const createVlanSchema = z.object({
  vlanNumber: z.number().int().min(1).max(4094),
  name: z.string().min(1, 'VLAN name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  status: z.nativeEnum(VlanStatus).optional(),
  locationId: uuidSchema.nullable().optional(),
});

export const updateVlanSchema = createVlanSchema.partial();

export const vlanQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  locationId: uuidSchema.optional(),
});

// --- Subnet Schemas ---

export const createSubnetSchema = z.object({
  cidr: z.string().regex(cidrRegex, 'Invalid IPv4 CIDR format (e.g. 10.232.130.0/24)'),
  name: z.string().min(1, 'Subnet name is required').max(100),
  vlanId: uuidSchema.nullable().optional(),
  locationId: uuidSchema.nullable().optional(),
  gateway: z.string().regex(ipv4Regex, 'Invalid IPv4 gateway address').nullable().optional(),
  networkAddress: z.string().regex(ipv4Regex).nullable().optional(),
  netmask: z.string().regex(ipv4Regex).nullable().optional(),
  broadcastAddress: z.string().regex(ipv4Regex).nullable().optional(),
  startIp: z.string().regex(ipv4Regex).nullable().optional(),
  endIp: z.string().regex(ipv4Regex).nullable().optional(),
  totalIps: z.union([z.number().int().positive(), z.string()]).optional(),
  reservedIps: z.number().int().min(0).optional(),
  description: z.string().max(500).nullable().optional(),
  // legacy compatibility
  vlan: z.string().optional(),
  vlanName: z.string().optional(),
  location: z.string().optional(),
});

export const updateSubnetSchema = createSubnetSchema.partial();

export const subnetQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  vlanId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
});

// --- IP Address Schemas ---

export const createIpAddressSchema = z.object({
  address: z.string().regex(ipv4Regex, 'Invalid IPv4 address').optional(),
  ip: z.string().regex(ipv4Regex, 'Invalid IPv4 address').optional(),
  hostname: z.string().max(255).nullable().optional(),
  macAddress: z.string().max(50).nullable().optional(),
  mac: z.string().max(50).nullable().optional(),
  vendor: z.string().max(100).nullable().optional(),
  deviceType: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  section: z.string().max(100).nullable().optional(),
  floor: z.string().max(50).nullable().optional(),
  subnetId: uuidSchema.nullable().optional(),
  vlanId: uuidSchema.nullable().optional(),
  locationId: uuidSchema.nullable().optional(),
  assetId: uuidSchema.nullable().optional(),
  assignedUserId: uuidSchema.nullable().optional(),
  status: z.union([z.nativeEnum(IPStatus), z.string()]).optional(),
  pingStatus: z.string().max(50).optional(),
  responseTimeMs: z.number().min(0).nullable().optional(),
  lastSeen: z.string().datetime().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  // legacy compatibility
  subnet: z.string().optional(),
  subnetName: z.string().optional(),
  vlan: z.string().optional(),
  vlanName: z.string().optional(),
});

export const updateIpAddressSchema = createIpAddressSchema.partial();

export const ipAddressQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  vlanId: z.string().optional(),
  vlan: z.string().optional(),
  subnetId: z.string().optional(),
  subnet: z.string().optional(),
  status: z.string().optional(),
  deviceType: z.string().optional(),
  locationId: uuidSchema.optional(),
});

// --- Utility & Automation Schemas ---

export const calculateSubnetQuerySchema = z.object({
  cidr: z.string().regex(cidrRegex, 'Invalid IPv4 CIDR format (e.g. 10.232.130.0/24)'),
});

export const autoDetectQuerySchema = z.object({
  ip: z.string().regex(ipv4Regex, 'Invalid IPv4 address format (e.g. 10.232.130.15)'),
});

export const macVendorQuerySchema = z.object({
  mac: z.string().min(6, 'MAC address must have at least 6 characters').max(50),
});
