import type { Location } from './common';
import type { DirectoryUser } from './directory';
import type { IPAddress, NetworkSwitch, SwitchPort } from './network';
import type { Department } from './organization';

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
  LOST = 'LOST',
}

export interface AssetCategory {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  category?: AssetCategory | null;
  status: AssetStatus | `${AssetStatus}` | string;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  assignedToId?: string | null;
  assignedTo?: DirectoryUser | null;
  assignedUser?: string;
  assignedEmail?: string;
  departmentId?: string | null;
  department?: Department | null;
  locationId?: string | null;
  location?: Location | null;
  locationPath?: string;
  organizationId?: string | null;
  organization?: string | null;
  ipAddresses?: IPAddress[];
  networkSwitch?: NetworkSwitch | null;
  connectedPorts?: SwitchPort[];
  networkConnectivity?: {
    upstreamSwitch: string;
    upstreamPort: string;
    linkStatus: string;
    rackName?: string | null;
    rackUnit?: number | null;
  } | null;
  notes?: string | null;
  // UI legacy aliases
  tag?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authoritative Standardized IT Hardware Categories (11 Pure IT Categories)
 */
export const IT_ASSET_CATEGORY_IDS = {
  LAPTOP: 'cat-laptop',
  DESKTOP: 'cat-desktop',
  SERVER: 'cat-server',
  SWITCH: 'cat-switch',
  ROUTER: 'cat-router',
  ACCESS_POINT: 'cat-ap',
  MONITOR: 'cat-monitor',
  PRINTER: 'cat-printer',
  STORAGE: 'cat-storage',
  POWER_UPS: 'cat-ups',
  PERIPHERAL: 'cat-peripheral',
} as const;

export type ITAssetCategoryId = (typeof IT_ASSET_CATEGORY_IDS)[keyof typeof IT_ASSET_CATEGORY_IDS];

export interface ITAssetCategoryDefinition {
  id: ITAssetCategoryId | string;
  code: string;
  name: string;
  icon: string;
  description: string;
}

export const IT_ASSET_CATEGORIES: Record<string, ITAssetCategoryDefinition> = {
  [IT_ASSET_CATEGORY_IDS.LAPTOP]: {
    id: IT_ASSET_CATEGORY_IDS.LAPTOP,
    code: 'LAP',
    name: 'Laptops / Notebooks',
    icon: 'LaptopOutlined',
    description: 'Enterprise mobile laptops, ultrabooks, and portable engineering notebooks',
  },
  [IT_ASSET_CATEGORY_IDS.DESKTOP]: {
    id: IT_ASSET_CATEGORY_IDS.DESKTOP,
    code: 'DSK',
    name: 'Desktops & Workstations',
    icon: 'DesktopOutlined',
    description: 'Business desktop PCs, CAD/CAM workstations, and compact client terminals',
  },
  [IT_ASSET_CATEGORY_IDS.SERVER]: {
    id: IT_ASSET_CATEGORY_IDS.SERVER,
    code: 'SRV',
    name: 'Servers (Rackmount / Host)',
    icon: 'CloudServerOutlined',
    description:
      'Enterprise 1U/2U/4U rackmount servers, tower hosts, and virtualization compute nodes',
  },
  [IT_ASSET_CATEGORY_IDS.SWITCH]: {
    id: IT_ASSET_CATEGORY_IDS.SWITCH,
    code: 'SW',
    name: 'Network Switches',
    icon: 'ClusterOutlined',
    description: 'Managed L2/L3 access, distribution, and core datacenter ethernet switches',
  },
  [IT_ASSET_CATEGORY_IDS.ROUTER]: {
    id: IT_ASSET_CATEGORY_IDS.ROUTER,
    code: 'RTF',
    name: 'Routers & Firewalls',
    icon: 'SafetyCertificateOutlined',
    description: 'Edge routers, next-generation firewalls (NGFW), and SD-WAN gateway appliances',
  },
  [IT_ASSET_CATEGORY_IDS.ACCESS_POINT]: {
    id: IT_ASSET_CATEGORY_IDS.ACCESS_POINT,
    code: 'WAP',
    name: 'Wireless Access Points (AP)',
    icon: 'WifiOutlined',
    description:
      'Enterprise indoor/outdoor wireless access points, Wi-Fi 6/6E/7 APs and controllers',
  },
  [IT_ASSET_CATEGORY_IDS.MONITOR]: {
    id: IT_ASSET_CATEGORY_IDS.MONITOR,
    code: 'MON',
    name: 'Monitors & Displays',
    icon: 'FundViewOutlined',
    description:
      'Professional FHD, 2K, 4K desktop monitors, ultrawide displays, and conference panels',
  },
  [IT_ASSET_CATEGORY_IDS.PRINTER]: {
    id: IT_ASSET_CATEGORY_IDS.PRINTER,
    code: 'PRN',
    name: 'Printers & Scanners',
    icon: 'PrinterOutlined',
    description:
      'Network laser printers, multi-function copiers, document scanners, and industrial barcode printers',
  },
  [IT_ASSET_CATEGORY_IDS.STORAGE]: {
    id: IT_ASSET_CATEGORY_IDS.STORAGE,
    code: 'STG',
    name: 'Storage (NAS / SAN)',
    icon: 'DatabaseOutlined',
    description:
      'Network attached storage (NAS), SAN storage arrays, and backup deduplication appliances',
  },
  [IT_ASSET_CATEGORY_IDS.POWER_UPS]: {
    id: IT_ASSET_CATEGORY_IDS.POWER_UPS,
    code: 'UPS',
    name: 'Power & UPS',
    icon: 'ThunderboltOutlined',
    description:
      'Online double-conversion rackmount UPS units, battery packs, and intelligent PDUs',
  },
  [IT_ASSET_CATEGORY_IDS.PERIPHERAL]: {
    id: IT_ASSET_CATEGORY_IDS.PERIPHERAL,
    code: 'PER',
    name: 'Peripherals & Accessories',
    icon: 'AppstoreOutlined',
    description:
      'Thunderbolt/USB-C docking stations, conference webcams, speakerphones, and barcode scanners',
  },
};
