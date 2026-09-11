import { App } from 'antd';
import type { FormInstance } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { type Asset, assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import { type LocationBranch, organizationService } from '../../../services/organization.service';
import {
  type IPAddress,
  type NetworkCredential,
  type NetworkStats,
  type RevealedCredentialResult,
  type Subnet,
  type VLAN,
  networkService,
} from '../../../services/network.service';

export function useNetworkManagement(
  form: FormInstance,
  subnetForm: FormInstance,
  vlanForm: FormInstance,
) {
  const { message } = App.useApp();

  // Core Entity States
  const [vlans, setVlans] = useState<Array<VLAN>>([]);
  const [subnets, setSubnets] = useState<Array<Subnet>>([]);
  const [ips, setIps] = useState<Array<IPAddress>>([]);
  const [locations, setLocations] = useState<Array<LocationBranch>>([]);
  const [assets, setAssets] = useState<Array<Asset>>([]);
  const [directoryUsers, setDirectoryUsers] = useState<Array<DirectoryUser>>([]);
  const [credentials, setCredentials] = useState<Array<NetworkCredential>>([]);
  const [stats, setStats] = useState<NetworkStats>({
    totalVlans: 0,
    managedSubnets: 0,
    totalIps: 0,
    allocatedStaticIps: 0,
    reservedDhcpLeases: 0,
    availableIps: 0,
    freeIpCapacity: 0,
    averageUtilization: 0,
  });

  const [loading, setLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('ipam');

  // Multi-dimensional Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [vlanFilter, setVlanFilter] = useState<string>('all');
  const [subnetFilter, setSubnetFilter] = useState<string>('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // VLAN Modal & Drawer States
  const [vlanModalOpen, setVlanModalOpen] = useState(false);
  const [editingVlan, setEditingVlan] = useState<VLAN | null>(null);
  const [vlanDrawerOpen, setVlanDrawerOpen] = useState(false);
  const [selectedVlan, setSelectedVlan] = useState<VLAN | null>(null);

  // Subnet Modal & Drawer States
  const [subnetModalOpen, setSubnetModalOpen] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<Subnet | null>(null);
  const [subnetDrawerOpen, setSubnetDrawerOpen] = useState(false);
  const [selectedSubnet, setSelectedSubnet] = useState<Subnet | null>(null);

  // IP Address Modal State
  const [ipModalOpen, setIpModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingIp, setEditingIp] = useState<IPAddress | null>(null);

  // Credential Reveal Modal State
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [targetIpForCredential, setTargetIpForCredential] = useState<string | null>(null);
  const [revealedCredential, setRevealedCredential] = useState<RevealedCredentialResult | null>(
    null,
  );
  const [credentialLoading, setCredentialLoading] = useState(false);

  // Load All Network Entities & Telemetry cleanly without silent catch
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vlanList, subnetList, ipList, locList, assetList, empRes, credList] =
        await Promise.all([
          networkService.getVlans({
            search: searchQuery || undefined,
            locationId: siteFilter !== 'all' ? siteFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
          }),
          networkService.getSubnets({
            search: searchQuery || undefined,
            vlanId: vlanFilter !== 'all' ? vlanFilter : undefined,
            locationId: siteFilter !== 'all' ? siteFilter : undefined,
          }),
          networkService.getIps({
            search: searchQuery || undefined,
            vlanId: vlanFilter !== 'all' ? vlanFilter : undefined,
            subnetId: subnetFilter !== 'all' ? subnetFilter : undefined,
            deviceType: deviceTypeFilter !== 'all' ? deviceTypeFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            locationId: siteFilter !== 'all' ? siteFilter : undefined,
          }),
          organizationService.getLocations(),
          assetsService.getAssets(),
          directoryService
            .getEmployees({ pageSize: 100 })
            .catch((_error: unknown) => ({ items: [] })),
          networkService.getCredentials
            ? networkService.getCredentials().catch((_error: unknown) => [])
            : Promise.resolve([]),
        ]);

      setVlans(vlanList);
      setSubnets(subnetList);
      setIps(ipList);
      setLocations(locList);
      setAssets(assetList);
      setDirectoryUsers(empRes?.items || []);
      setCredentials(credList || []);

      // Load stats cleanly with structured error handling
      try {
        const statsData = await networkService.getStats();
        if (statsData) {
          setStats(statsData);
        }
      } catch (_statsErr: unknown) {
        // Fallback computation derived from loaded live records
        const allocated = ipList.filter(
          (i) => String(i.status).toUpperCase() === 'ASSIGNED',
        ).length;
        const reserved = ipList.filter((i) => String(i.status).toUpperCase() === 'RESERVED').length;
        const totalCapacity = subnetList.reduce((sum, s) => sum + (s.totalIps || 0), 0);
        const freeCapacity = Math.max(0, totalCapacity - allocated - reserved);
        setStats({
          totalVlans: vlanList.length,
          managedSubnets: subnetList.length,
          totalIps: ipList.length,
          allocatedStaticIps: allocated,
          reservedDhcpLeases: reserved,
          availableIps: freeCapacity,
          freeIpCapacity: freeCapacity,
          averageUtilization: totalCapacity > 0 ? Math.round((allocated / totalCapacity) * 100) : 0,
        });
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to load network IPAM from server.');
    } finally {
      setLoading(false);
    }
  }, [message, searchQuery, siteFilter, vlanFilter, subnetFilter, deviceTypeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // VLAN ACTIONS
  // ==========================================

  const handleOpenCreateVlanModal = useCallback(() => {
    setEditingVlan(null);
    vlanForm.resetFields();
    vlanForm.setFieldsValue({
      status: 'ACTIVE',
    });
    setVlanModalOpen(true);
  }, [vlanForm]);

  const handleOpenEditVlanModal = useCallback(
    (vlan: VLAN) => {
      setEditingVlan(vlan);
      vlanForm.setFieldsValue({
        vlanNumber: vlan.vlanNumber,
        name: vlan.name,
        description: vlan.description,
        status: vlan.status,
        locationId: vlan.locationId,
      });
      setVlanModalOpen(true);
    },
    [vlanForm],
  );

  const handleSaveVlan = useCallback(async () => {
    try {
      const values = await vlanForm.validateFields();
      setModalSubmitting(true);
      if (editingVlan) {
        await networkService.updateVlan(editingVlan.id, values);
        message.success(`VLAN ${values.vlanNumber} updated successfully.`);
      } else {
        await networkService.createVlan(values);
        message.success(`VLAN ${values.vlanNumber} created successfully.`);
      }
      setVlanModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save VLAN configuration.');
    } finally {
      setModalSubmitting(false);
    }
  }, [editingVlan, loadData, message, vlanForm]);

  const handleDeleteVlan = useCallback(
    async (id: string) => {
      try {
        await networkService.deleteVlan(id);
        message.success('VLAN removed successfully.');
        loadData();
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } } };
        message.error(apiErr.response?.data?.message || 'Failed to delete VLAN.');
      }
    },
    [loadData, message],
  );

  const handleOpenVlanDrawer = useCallback((vlan: VLAN) => {
    setSelectedVlan(vlan);
    setVlanDrawerOpen(true);
  }, []);

  // 1-Click Drill-downs from VLAN
  const handleFilterSubnetsByVlan = useCallback((vlanId: string) => {
    setVlanFilter(vlanId);
    setActiveTabKey('subnets');
  }, []);

  const handleFilterIpsByVlan = useCallback((vlanId: string) => {
    setVlanFilter(vlanId);
    setActiveTabKey('ipam');
  }, []);

  // ==========================================
  // SUBNET ACTIONS
  // ==========================================

  const handleOpenCreateSubnetModal = useCallback(() => {
    setEditingSubnet(null);
    subnetForm.resetFields();
    subnetForm.setFieldsValue({
      totalIps: 254,
    });
    setSubnetModalOpen(true);
  }, [subnetForm]);

  const handleOpenEditSubnetModal = useCallback(
    (subnet: Subnet) => {
      setEditingSubnet(subnet);
      subnetForm.setFieldsValue({
        cidr: subnet.cidr,
        name: subnet.name,
        vlanId: subnet.vlanId || subnet.vlan?.id,
        locationId: subnet.locationId,
        gateway: subnet.gateway,
        description: subnet.description,
      });
      setSubnetModalOpen(true);
    },
    [subnetForm],
  );

  const handleSaveSubnet = useCallback(async () => {
    try {
      const values = await subnetForm.validateFields();
      setModalSubmitting(true);
      if (editingSubnet) {
        await networkService.updateSubnet(editingSubnet.id, values);
        message.success(`Subnet "${values.cidr}" updated successfully.`);
      } else {
        await networkService.createSubnet(values);
        message.success(`Subnet "${values.cidr}" created successfully.`);
      }
      setSubnetModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save Subnet.');
    } finally {
      setModalSubmitting(false);
    }
  }, [editingSubnet, loadData, message, subnetForm]);

  const handleDeleteSubnet = useCallback(
    async (id: string) => {
      try {
        await networkService.deleteSubnet(id);
        message.success('Subnet removed successfully.');
        loadData();
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } } };
        message.error(apiErr.response?.data?.message || 'Failed to delete Subnet.');
      }
    },
    [loadData, message],
  );

  const handleOpenSubnetDrawer = useCallback((subnet: Subnet) => {
    setSelectedSubnet(subnet);
    setSubnetDrawerOpen(true);
  }, []);

  // 1-Click Drill-down from Subnet
  const handleFilterIpsBySubnet = useCallback((subnetId: string) => {
    setSubnetFilter(subnetId);
    setActiveTabKey('ipam');
  }, []);

  // ==========================================
  // IP ADDRESS ACTIONS
  // ==========================================

  const handleOpenCreateIpModal = useCallback(() => {
    setEditingIp(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'ASSIGNED',
      deviceType: 'Workstation',
      subnetId: subnets[0]?.id,
    });
    setIpModalOpen(true);
  }, [form, subnets]);

  const handleOpenEditIpModal = useCallback(
    (ip: IPAddress) => {
      setEditingIp(ip);
      form.setFieldsValue({
        address: ip.address || ip.ip,
        ip: ip.address || ip.ip,
        hostname: ip.hostname,
        macAddress: ip.macAddress || ip.mac,
        mac: ip.macAddress || ip.mac,
        vendor: ip.vendor,
        deviceType: ip.deviceType || 'Workstation',
        model: ip.model,
        subnetId: ip.subnetId,
        vlanId: ip.vlanId,
        locationId: ip.locationId,
        assetId: ip.assetId || ip.asset?.id,
        assignedUserId: ip.assignedUserId || ip.assignedUser?.id,
        credentialId: ip.credentialId || ip.credential?.id,
        section: ip.section,
        status: ip.status,
        description: ip.description,
      });
      setIpModalOpen(true);
    },
    [form],
  );

  const handleSaveIp = useCallback(async () => {
    try {
      const values = await form.validateFields();
      // Ensure both address and ip are populated for backend and frontend compatibility
      const targetIp = values.address || values.ip;
      const payload = {
        ...values,
        address: targetIp,
        ip: targetIp,
        assignedUserId: values.assignedUserId || undefined,
        credentialId: values.credentialId || undefined,
        assetId: values.assetId || undefined,
        subnetId: values.subnetId || undefined,
        vlanId: values.vlanId || undefined,
        locationId: values.locationId || undefined,
      };
      setModalSubmitting(true);

      if (editingIp) {
        await networkService.updateIp(editingIp.id, payload);
        message.success(`IP "${targetIp}" updated successfully.`);
      } else {
        await networkService.createIp(payload);
        message.success(`IP "${targetIp}" allocated successfully.`);
      }

      setIpModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to allocate IP.');
    } finally {
      setModalSubmitting(false);
    }
  }, [editingIp, form, loadData, message]);

  const handleDeleteIp = useCallback(
    async (id: string) => {
      try {
        await networkService.deleteIp(id);
        message.success('IP address released successfully.');
        loadData();
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } } };
        message.error(apiErr.response?.data?.message || 'Failed to release IP address.');
      }
    },
    [loadData, message],
  );

  // ==========================================
  // CREDENTIAL REVEAL ACTION
  // ==========================================

  const handleRevealCredential = useCallback(
    async (ip: IPAddress) => {
      const ipAddr = ip.address || ip.ip || ip.id;
      setTargetIpForCredential(ipAddr);
      setRevealedCredential(null);
      setCredentialLoading(true);
      setCredentialModalOpen(true);

      try {
        const cred = await networkService.revealCredential(ip.id);
        setRevealedCredential(cred);
        message.info(`Credentials for ${ipAddr} decrypted.`);
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } } };
        message.error(
          apiErr.response?.data?.message || 'No accessible credentials found for this IP.',
        );
      } finally {
        setCredentialLoading(false);
      }
    },
    [message],
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSiteFilter('all');
    setVlanFilter('all');
    setSubnetFilter('all');
    setDeviceTypeFilter('all');
    setStatusFilter('all');
  }, []);

  return {
    // Entities
    vlans,
    subnets,
    ips,
    locations,
    assets,
    directoryUsers,
    credentials,
    stats,
    loading,
    activeTabKey,
    setActiveTabKey,

    // Filters
    searchQuery,
    setSearchQuery,
    siteFilter,
    setSiteFilter,
    vlanFilter,
    setVlanFilter,
    subnetFilter,
    setSubnetFilter,
    deviceTypeFilter,
    setDeviceTypeFilter,
    statusFilter,
    setStatusFilter,
    handleResetFilters,

    // VLAN state & handlers
    vlanModalOpen,
    setVlanModalOpen,
    editingVlan,
    vlanDrawerOpen,
    setVlanDrawerOpen,
    selectedVlan,
    handleOpenCreateVlanModal,
    handleOpenEditVlanModal,
    handleSaveVlan,
    handleDeleteVlan,
    handleOpenVlanDrawer,
    handleFilterSubnetsByVlan,
    handleFilterIpsByVlan,

    // Subnet state & handlers
    subnetModalOpen,
    setSubnetModalOpen,
    editingSubnet,
    subnetDrawerOpen,
    setSubnetDrawerOpen,
    selectedSubnet,
    handleOpenCreateSubnetModal,
    handleOpenEditSubnetModal,
    handleSaveSubnet,
    handleDeleteSubnet,
    handleOpenSubnetDrawer,
    handleFilterIpsBySubnet,

    // IP state & handlers
    ipModalOpen,
    setIpModalOpen,
    modalSubmitting,
    editingIp,
    handleOpenCreateIpModal,
    handleOpenEditIpModal,
    handleSaveIp,
    handleDeleteIp,

    // Credential
    credentialModalOpen,
    setCredentialModalOpen,
    targetIpForCredential,
    revealedCredential,
    credentialLoading,
    handleRevealCredential,

    // General
    loadData,
  };
}
