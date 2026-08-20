import {
  ApiOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Flex, Form, Tabs, Tooltip } from 'antd';
import { useMemo } from 'react';
import PageContainer from '../../components/PageContainer';
import { DnsTable } from './components/DnsTable';
import { IpAddressTable } from './components/IpAddressTable';
import { IpFormModal } from './components/IpFormModal';
import { PingToolModal } from './components/PingToolModal';
import { SubnetCardList } from './components/SubnetCardList';
import { SubnetFormModal } from './components/SubnetFormModal';
import { useNetworkManagement } from './hooks/useNetworkManagement';

export default function NetworkPage() {
  const [form] = Form.useForm();
  const [subnetForm] = Form.useForm();

  const {
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
  } = useNetworkManagement(form, subnetForm);

  const statsItems = useMemo(
    () => [
      {
        title: 'Managed Subnets',
        value: stats.managedSubnets,
        prefix: <CloudServerOutlined />,
        color: '#1677ff',
      },
      {
        title: 'Allocated Static IPs',
        value: stats.allocatedStaticIps,
        prefix: <CheckCircleOutlined />,
        color: '#10b981',
      },
      {
        title: 'Reserved DHCP Leases',
        value: stats.reservedDhcpLeases,
        prefix: <ApiOutlined />,
        color: '#6366f1',
      },
      {
        title: 'Free IP Capacity',
        value: stats.freeIpCapacity,
        prefix: <GlobalOutlined />,
        color: '#059669',
      },
    ],
    [stats],
  );

  const tabItems = useMemo(
    () => [
      {
        key: 'ipam',
        label: (
          <span>
            <ApiOutlined /> IP Allocations ({ips.length})
          </span>
        ),
        children: (
          <IpAddressTable
            ips={ips}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            vlanFilter={vlanFilter}
            onVlanChange={setVlanFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onResetFilters={handleResetFilters}
            onPingTest={handlePingTest}
            onOpenEditModal={handleOpenEditIpModal}
            onDeleteIp={handleDeleteIp}
          />
        ),
      },
      {
        key: 'subnets',
        label: (
          <span>
            <CloudServerOutlined /> Subnets ({subnets.length})
          </span>
        ),
        children: <SubnetCardList subnets={subnets} />,
      },
      {
        key: 'dns',
        label: (
          <span>
            <GlobalOutlined /> DNS Records
          </span>
        ),
        children: <DnsTable dnsRecords={dnsRecords} />,
      },
    ],
    [
      ips,
      loading,
      searchQuery,
      setSearchQuery,
      vlanFilter,
      setVlanFilter,
      statusFilter,
      setStatusFilter,
      handleResetFilters,
      handlePingTest,
      handleOpenEditIpModal,
      handleDeleteIp,
      subnets,
      dnsRecords,
    ],
  );

  return (
    <PageContainer
      title="Network & IPAM"
      subtitle="Manage IP address allocations, subnet CIDR blocks, DNS records, and network diagnostics."
      breadcrumbs={[{ title: 'Network' }]}
      stats={statsItems}
      extra={
        <Flex gap={8}>
          <Tooltip title="Refresh network">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button onClick={handleOpenSubnetModal}>Create Subnet</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateIpModal}>
            Allocate IP
          </Button>
        </Flex>
      }
    >
      <Tabs defaultActiveKey="ipam" items={tabItems} />

      <IpFormModal
        open={ipModalOpen}
        editingIp={editingIp}
        form={form}
        submitting={modalSubmitting}
        onSave={handleSaveIp}
        onCancel={() => setIpModalOpen(false)}
      />

      <SubnetFormModal
        open={subnetModalOpen}
        form={subnetForm}
        submitting={modalSubmitting}
        onSave={handleSaveSubnet}
        onCancel={() => setSubnetModalOpen(false)}
      />

      <PingToolModal
        open={pingModalOpen}
        pinging={pinging}
        pingResult={pingResult}
        onClose={() => setPingModalOpen(false)}
      />
    </PageContainer>
  );
}
