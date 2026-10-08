import React from 'react';
import type { Subnet, VLAN } from '../../../services/network.service';
import { VlanTable } from './VlanTable';

export interface VlanManagementTabProps {
  vlans: Array<VLAN>;
  subnets: Array<Subnet>;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  onResetFilters: () => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (vlan: VLAN) => void;
  onOpenDetailDrawer: (vlan: VLAN) => void;
  onDeleteVlan: (id: string) => void;
}

export const VlanManagementTab: React.FC<VlanManagementTabProps> = React.memo((props) => {
  return <VlanTable {...props} />;
});

VlanManagementTab.displayName = 'VlanManagementTab';
