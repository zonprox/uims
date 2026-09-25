import {
  IPStatus,
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  RackStatus,
  SwitchRole,
  SwitchStatus,
  VlanStatus,
} from '@uims/shared-types';
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
  switchPortId: uuidSchema.nullable().optional(),
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
  switchPortId: uuidSchema.optional(),
  switchId: uuidSchema.optional(),
});

// --- Network Rack Schemas ---

export const createRackSchema = z.object({
  name: z.string().min(1, 'Rack name is required').max(100),
  code: z.string().min(1, 'Rack code is required').max(50),
  locationId: uuidSchema.nullable().optional(),
  totalHeight: z.number().int().min(1).max(100).default(42).optional(),
  depth: z.number().positive().nullable().optional(),
  width: z.number().positive().nullable().optional(),
  maxPowerKw: z.number().positive().nullable().optional(),
  maxWeightKg: z.number().positive().nullable().optional(),
  status: z.nativeEnum(RackStatus).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateRackSchema = createRackSchema.partial();

export const rackQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  locationId: uuidSchema.optional(),
  status: z.string().optional(),
});

// --- Network Switch Schemas ---

export const createSwitchSchema = z.object({
  name: z.string().min(1, 'Switch name is required').max(100),
  model: z.string().min(1, 'Switch model is required').max(100),
  vendor: z.string().min(1, 'Vendor is required').max(100),
  serialNumber: z.string().max(100).nullable().optional(),
  macAddress: z.string().regex(macRegex, 'Invalid MAC address').nullable().optional(),
  ipAddressId: uuidSchema.nullable().optional(),
  firmwareVersion: z.string().max(100).nullable().optional(),
  role: z.nativeEnum(SwitchRole).optional(),
  status: z.nativeEnum(SwitchStatus).optional(),
  totalPorts: z.number().int().min(1).max(128).default(24).optional(),
  rackId: uuidSchema.nullable().optional(),
  rackPosition: z.number().int().min(1).max(100).nullable().optional(),
  rackHeight: z.number().int().min(1).max(10).default(1).optional(),
  assetId: uuidSchema.nullable().optional(),
  locationId: uuidSchema.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateSwitchSchema = createSwitchSchema.partial();

export const switchQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  rackId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  vendor: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

// --- Switch Port Schemas ---

export const createSwitchPortSchema = z.object({
  switchId: uuidSchema,
  portNumber: z.number().int().min(1).max(128),
  name: z.string().min(1, 'Port name is required').max(50),
  formFactor: z.nativeEnum(PortFormFactor).optional(),
  poeEnabled: z.boolean().optional(),
  adminStatus: z.nativeEnum(PortAdminStatus).optional(),
  operStatus: z.nativeEnum(PortOperStatus).optional(),
  speed: z.string().max(50).nullable().optional(),
  duplex: z.string().max(50).nullable().optional(),
  vlanId: uuidSchema.nullable().optional(),
  mode: z.nativeEnum(PortMode).optional(),
  taggedVlanIds: z
    .array(z.union([z.number().int(), z.string()]))
    .nullable()
    .optional(),
  ipAddressId: uuidSchema.nullable().optional(),
  connectedAssetId: uuidSchema.nullable().optional(),
  description: z.string().max(255).nullable().optional(),
});

export const updateSwitchPortSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  formFactor: z.nativeEnum(PortFormFactor).optional(),
  poeEnabled: z.boolean().optional(),
  adminStatus: z.nativeEnum(PortAdminStatus).optional(),
  operStatus: z.nativeEnum(PortOperStatus).optional(),
  speed: z.string().max(50).nullable().optional(),
  duplex: z.string().max(50).nullable().optional(),
  vlanId: uuidSchema.nullable().optional(),
  mode: z.nativeEnum(PortMode).optional(),
  taggedVlanIds: z
    .array(z.union([z.number().int(), z.string()]))
    .nullable()
    .optional(),
  ipAddressId: uuidSchema.nullable().optional(),
  connectedAssetId: uuidSchema.nullable().optional(),
  description: z.string().max(255).nullable().optional(),
});

export const switchPortQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  switchId: uuidSchema.optional(),
  vlanId: uuidSchema.optional(),
  adminStatus: z.string().optional(),
  operStatus: z.string().optional(),
  mode: z.string().optional(),
  search: z.string().optional(),
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
