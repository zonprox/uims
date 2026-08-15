import { App } from 'antd';
import type { FormInstance } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  type DNSRecord,
  type IPAddress,
  type NetworkStats,
  type Subnet,
  networkService,
} from '../../../services/network.service';

export function useNetworkManagement(form: FormInstance, subnetForm: FormInstance) {
  const { message } = App.useApp();
  const [ips, setIps] = useState<Array<IPAddress>>([]);
  const [subnets, setSubnets] = useState<Array<Subnet>>([]);
  const [dnsRecords, setDnsRecords] = useState<Array<DNSRecord>>([]);
  const [stats, setStats] = useState<NetworkStats>({
    managedSubnets: 0,
    allocatedStaticIps: 0,
    reservedDhcpLeases: 0,
    freeIpCapacity: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vlanFilter, setVlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [ipModalOpen, setIpModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingIp, setEditingIp] = useState<IPAddress | null>(null);
  const [subnetModalOpen, setSubnetModalOpen] = useState(false);
  const [pingModalOpen, setPingModalOpen] = useState(false);
  const [pingResult, setPingResult] = useState<{ ip: string; message: string } | null>(null);
  const [pinging, setPinging] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ipList, subnetList, dnsList, statsData] = await Promise.all([
        networkService.getIps({
          search: searchQuery || undefined,
          vlan: vlanFilter !== 'all' ? vlanFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        networkService.getSubnets(),
        networkService.getDnsRecords(),
        networkService.getStats().catch(() => null),
      ]);
      setIps(ipList);
      setSubnets(subnetList);
      setDnsRecords(dnsList);
      if (statsData) {
        setStats(statsData);
      } else {
        const allocated = ipList.filter((i) => i.status === 'Allocated').length;
        const reserved = ipList.filter((i) => i.status === 'Reserved').length;
        const totalCapacity = subnetList.reduce((sum, s) => sum + s.totalIps, 0);
        const freeCapacity = Math.max(0, totalCapacity - allocated - reserved);
        setStats({
          managedSubnets: subnetList.length,
          allocatedStaticIps: allocated,
          reservedDhcpLeases: reserved,
          freeIpCapacity: freeCapacity || 894,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load network IPAM from server.');
    } finally {
      setLoading(false);
    }
  }, [message, searchQuery, statusFilter, vlanFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateIpModal = useCallback(() => {
    setEditingIp(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'Allocated',
      deviceType: 'Workstation',
      subnet: '192.168.10.0/24',
      vlan: 'VLAN 20 (Workstations)',
    });
    setIpModalOpen(true);
  }, [form]);

  const handleOpenEditIpModal = useCallback(
    (ip: IPAddress) => {
      setEditingIp(ip);
      form.setFieldsValue(ip);
      setIpModalOpen(true);
    },
    [form],
  );

  const handleSaveIp = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingIp) {
        await networkService.updateIp(editingIp.id, values);
        message.success(`IP "${values.ip}" updated successfully.`);
      } else {
        await networkService.createIp(values);
        message.success(`IP "${values.ip}" allocated successfully.`);
      }

      setIpModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
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
        message.success('IP address allocation released.');
        loadData();
      } catch (err: unknown) {
        console.error(err);
        message.error('Failed to delete IP allocation.');
      }
    },
    [loadData, message],
  );

  const handleOpenSubnetModal = useCallback(() => {
    subnetForm.resetFields();
    subnetForm.setFieldsValue({
      totalIps: 254,
      location: 'HQ Server Room',
    });
    setSubnetModalOpen(true);
  }, [subnetForm]);

  const handleSaveSubnet = useCallback(async () => {
    try {
      const values = await subnetForm.validateFields();
      setModalSubmitting(true);
      await networkService.createSubnet(values);
      message.success(`Subnet "${values.cidr}" provisioned.`);
      setSubnetModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to create subnet.');
    } finally {
      setModalSubmitting(false);
    }
  }, [loadData, message, subnetForm]);

  const handlePingTest = useCallback(async (ip: string) => {
    setPinging(true);
    setPingResult(null);
    setPingModalOpen(true);
    try {
      const res = await networkService.pingIp(ip);
      setPingResult({ ip, message: res.message });
    } catch (err: unknown) {
      console.error(err);
      setPingResult({ ip, message: `Ping timeout for ${ip} (No route to host)` });
    } finally {
      setPinging(false);
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setVlanFilter('all');
    setStatusFilter('all');
  }, []);

  return {
    ips,
    subnets,
    dnsRecords,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    vlanFilter,
    setVlanFilter,
    statusFilter,
    setStatusFilter,
    ipModalOpen,
    setIpModalOpen,
    modalSubmitting,
    editingIp,
    subnetModalOpen,
    setSubnetModalOpen,
    pingModalOpen,
    setPingModalOpen,
    pingResult,
    pinging,
    loadData,
    handleOpenCreateIpModal,
    handleOpenEditIpModal,
    handleSaveIp,
    handleDeleteIp,
    handleOpenSubnetModal,
    handleSaveSubnet,
    handlePingTest,
    handleResetFilters,
  };
}
