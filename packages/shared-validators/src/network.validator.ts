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

// Strict IPv4: rejects octets > 255 and rejects leading zeros (e.g. 01.0.0.1)
export const ipv4Regex =
  /^(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])(?:\.(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])){3}$/;

// Strict IPv6: RFC 4291 compliant full and compressed
export const ipv6Regex =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;

// Strict IPv4 CIDR: Prefix bounded to 0..32 without leading zeros
export const cidrRegex =
  /^(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])(?:\.(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])){3}\/(?:3[0-2]|[12][0-9]|[0-9])$/;

// IEEE Colon, Dash, Cisco Dotted Quad, and Bare 12-Hex MAC
export const macRegex =
  /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}$|^[0-9A-Fa-f]{12}$/;

// Reusable Primitive Network Schemas
export const ipv4Schema = z
  .string()
  .trim()
  .regex(ipv4Regex, 'Invalid IPv4 address format (e.g. 10.232.130.15)');

export const ipv6Schema = z
  .string()
  .trim()
  .regex(ipv6Regex, 'Invalid IPv6 address format');

export const cidrSchema = z
  .string()
  .trim()
  .regex(cidrRegex, 'Invalid IPv4 CIDR format (e.g. 10.232.130.0/24)');

export const macSchema = z
  .string()
  .trim()
  .regex(macRegex, 'Invalid MAC address format (e.g. 00:1B:44:11:3A:B7 or 001b.4411.3ab7)');

// --- VLAN Schemas ---

export const createVlanSchema = z.object({
  vlanNumber: z
    .number()
    .int('VLAN number must be an integer')
    .min(1, 'VLAN number must be at least 1')
    .max(4094, 'VLAN number cannot exceed 4094'),
  name: z.string().trim().min(1, 'VLAN name is required').max(100),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.nativeEnum(VlanStatus).default(VlanStatus.ACTIVE).optional(),
});

export const updateVlanSchema = createVlanSchema.partial();

export const vlanQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

// --- Subnet Schemas ---

export const createSubnetSchema = z.object({
  cidr: cidrSchema,
  name: z.string().trim().min(1, 'Subnet name is required').max(100),
  vlanId: uuidSchema.nullable().optional(),
  gateway: z
    .string()
    .trim()
    .regex(ipv4Regex, 'Invalid IPv4 gateway address')
    .nullable()
    .optional(),
  networkAddress: z.string().trim().regex(ipv4Regex).nullable().optional(),
  netmask: z.string().trim().regex(ipv4Regex).nullable().optional(),
  broadcastAddress: z.string().trim().regex(ipv4Regex).nullable().optional(),
  startIp: z.string().trim().regex(ipv4Regex).nullable().optional(),
  endIp: z.string().trim().regex(ipv4Regex).nullable().optional(),
  totalIps: z.coerce.number().int().min(0).optional(),
  reservedIps: z.coerce.number().int().min(0).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateSubnetSchema = createSubnetSchema.partial();

export const subnetQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  vlanId: uuidSchema.optional(),
});

// --- IP Address Schemas ---

export const createIpAddressSchema = z.object({
  address: z.string().trim().regex(ipv4Regex, 'Invalid IPv4 address format').optional(),
  macAddress: z
    .string()
    .trim()
    .regex(macRegex, 'Invalid MAC address format (e.g. 00:1B:44:11:3A:B7 or 001b.4411.3ab7)')
    .nullable()
    .optional(),
  vendor: z.string().trim().max(100).nullable().optional(),
  deviceType: z.string().trim().max(100).nullable().optional(),
  model: z.string().trim().max(100).nullable().optional(),
  serialNumber: z.string().trim().max(100).nullable().optional(),
  section: z.string().trim().max(100).nullable().optional(),
  floor: z.string().trim().max(50).nullable().optional(),
  subnetId: uuidSchema.nullable().optional(),
  vlanId: uuidSchema.nullable().optional(),
  assetId: uuidSchema.nullable().optional(),
  assignedUserId: uuidSchema.nullable().optional(),
  status: z.nativeEnum(IPStatus).default(IPStatus.AVAILABLE).optional(),
  pingStatus: z.string().trim().max(50).optional(),
  responseTimeMs: z.number().min(0).nullable().optional(),
  lastSeen: z.string().datetime().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  switchPortId: uuidSchema.nullable().optional(),
});

export const updateIpAddressSchema = createIpAddressSchema.partial();

export const ipAddressQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  vlanId: z.string().trim().optional(),
  subnetId: z.string().trim().optional(),
  status: z.string().trim().optional(),
  deviceType: z.string().trim().optional(),
  switchPortId: uuidSchema.optional(),
  switchId: uuidSchema.optional(),
});

// --- Network Rack Schemas ---

export const createRackSchema = z.object({
  name: z.string().trim().min(1, 'Rack name is required').max(100),
  code: z.string().trim().min(1, 'Rack code is required').max(50),
  totalHeight: z.number().int().min(1).max(100).default(42).optional(),
  depth: z.number().positive().nullable().optional(),
  width: z.number().positive().nullable().optional(),
  maxPowerKw: z.number().positive().nullable().optional(),
  maxWeightKg: z.number().positive().nullable().optional(),
  status: z.nativeEnum(RackStatus).default(RackStatus.ACTIVE).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const updateRackSchema = createRackSchema.partial();

export const rackQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

// --- Network Switch Schemas ---

export const createSwitchSchema = z.object({
  name: z.string().trim().min(1, 'Switch name is required').max(100),
  model: z.string().trim().min(1, 'Switch model is required').max(100),
  vendor: z.string().trim().min(1, 'Vendor is required').max(100),
  serialNumber: z.string().trim().max(100).nullable().optional(),
  macAddress: z.string().trim().regex(macRegex, 'Invalid MAC address').nullable().optional(),
  ipAddressId: uuidSchema.nullable().optional(),
  firmwareVersion: z.string().trim().max(100).nullable().optional(),
  role: z.nativeEnum(SwitchRole).default(SwitchRole.ACCESS).optional(),
  status: z.nativeEnum(SwitchStatus).default(SwitchStatus.ONLINE).optional(),
  totalPorts: z
    .number()
    .int('Total ports must be an integer')
    .min(2, 'Total ports must be at least 2')
    .max(48, 'Total ports cannot exceed 48')
    .refine((v) => v % 2 === 0, { message: 'Total ports must be an even number' })
    .default(24)
    .optional(),
  uplinkPorts: z
    .number()
    .int('Uplink ports must be an integer')
    .min(0, 'Uplink ports cannot be negative')
    .max(8, 'Uplink ports cannot exceed 8')
    .default(2)
    .optional(),
  fiberPorts: z
    .number()
    .int('Fiber ports must be an integer')
    .min(0, 'Fiber ports cannot be negative')
    .max(8, 'Fiber ports cannot exceed 8')
    .default(2)
    .optional(),
  uplinkSpeed: z.string().trim().nullable().optional(),
  fiberSpeed: z.string().trim().nullable().optional(),
  rackId: uuidSchema.nullable().optional(),
  rackPosition: z.number().int().min(1).max(100).nullable().optional(),
  rackHeight: z.number().int().min(1).max(10).default(1).optional(),
  assetId: uuidSchema.nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  autoGeneratePorts: z.boolean().optional(),
});

export const updateSwitchSchema = createSwitchSchema.partial();

export const switchQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  rackId: uuidSchema.optional(),
  vendor: z.string().trim().optional(),
  role: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

// --- Switch Port Schemas ---

export const taggedVlanItemSchema = z.union([
  z.number().int().min(1, 'VLAN ID must be >= 1').max(4094, 'VLAN ID must be <= 4094'),
  z
    .string()
    .regex(/^\d{1,4}$/, 'VLAN number must be digits')
    .refine((val) => {
      const num = parseInt(val, 10);
      return num >= 1 && num <= 4094;
    }, 'VLAN ID must be between 1 and 4094'),
]);

export const createSwitchPortSchema = z.object({
  switchId: uuidSchema,
  portNumber: z
    .number()
    .int('Port number must be an integer')
    .min(1, 'Port number must be at least 1')
    .max(128, 'Port number cannot exceed 128'),
  name: z.string().trim().min(1, 'Port name is required').max(50),
  formFactor: z.nativeEnum(PortFormFactor).default(PortFormFactor.RJ45_1G).optional(),
  poeEnabled: z.boolean().default(false).optional(),
  adminStatus: z.nativeEnum(PortAdminStatus).default(PortAdminStatus.UP).optional(),
  operStatus: z.nativeEnum(PortOperStatus).default(PortOperStatus.DOWN).optional(),
  speed: z.string().trim().max(50).nullable().optional(),
  duplex: z.string().trim().max(50).nullable().optional(),
  vlanId: uuidSchema.nullable().optional(),
  mode: z.nativeEnum(PortMode).default(PortMode.ACCESS).optional(),
  taggedVlanIds: z.array(taggedVlanItemSchema).nullable().optional(),
  ipAddressId: uuidSchema.nullable().optional(),
  connectedAssetId: uuidSchema.nullable().optional(),
  description: z.string().trim().max(255).nullable().optional(),
});

export const updateSwitchPortSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  formFactor: z.nativeEnum(PortFormFactor).optional(),
  poeEnabled: z.boolean().optional(),
  adminStatus: z.nativeEnum(PortAdminStatus).optional(),
  operStatus: z.nativeEnum(PortOperStatus).optional(),
  speed: z.string().trim().max(50).nullable().optional(),
  duplex: z.string().trim().max(50).nullable().optional(),
  vlanId: uuidSchema.nullable().optional(),
  mode: z.nativeEnum(PortMode).optional(),
  taggedVlanIds: z.array(taggedVlanItemSchema).nullable().optional(),
  ipAddressId: uuidSchema.nullable().optional(),
  connectedAssetId: uuidSchema.nullable().optional(),
  description: z.string().trim().max(255).nullable().optional(),
});

export const switchPortQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  switchId: uuidSchema.optional(),
  vlanId: uuidSchema.optional(),
  adminStatus: z.string().trim().optional(),
  operStatus: z.string().trim().optional(),
  mode: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

// --- Utility & Automation Schemas ---

export const calculateSubnetQuerySchema = z.object({
  cidr: cidrSchema,
});

export const autoDetectQuerySchema = z.object({
  ip: ipv4Schema,
});

export const macVendorQuerySchema = z.object({
  mac: z.string().trim().min(6, 'MAC address must have at least 6 characters').max(50),
});

export type CreateVlanInput = z.infer<typeof createVlanSchema>;
export type UpdateVlanInput = z.infer<typeof updateVlanSchema>;
export type VlanQueryInput = z.infer<typeof vlanQuerySchema>;
export type CreateSubnetInput = z.infer<typeof createSubnetSchema>;
export type UpdateSubnetInput = z.infer<typeof updateSubnetSchema>;
export type SubnetQueryInput = z.infer<typeof subnetQuerySchema>;
export type CreateIpAddressInput = z.infer<typeof createIpAddressSchema>;
export type UpdateIpAddressInput = z.infer<typeof updateIpAddressSchema>;
export type IpAddressQueryInput = z.infer<typeof ipAddressQuerySchema>;
export type CreateRackInput = z.infer<typeof createRackSchema>;
export type UpdateRackInput = z.infer<typeof updateRackSchema>;
export type RackQueryInput = z.infer<typeof rackQuerySchema>;
export type CreateSwitchInput = z.infer<typeof createSwitchSchema>;
export type UpdateSwitchInput = z.infer<typeof updateSwitchSchema>;
export type SwitchQueryInput = z.infer<typeof switchQuerySchema>;
export type CreateSwitchPortInput = z.infer<typeof createSwitchPortSchema>;
export type UpdateSwitchPortInput = z.infer<typeof updateSwitchPortSchema>;
export type SwitchPortQueryInput = z.infer<typeof switchPortQuerySchema>;
export type CalculateSubnetQueryInput = z.infer<typeof calculateSubnetQuerySchema>;
export type AutoDetectQueryInput = z.infer<typeof autoDetectQuerySchema>;
export type MacVendorQueryInput = z.infer<typeof macVendorQuerySchema>;
