import {
  ApartmentOutlined,
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
import { CredentialRevealModal } from './components/CredentialRevealModal';
import { IpAddressTable } from './components/IpAddressTable';
import { IpFormModal } from './components/IpFormModal';
import { SubnetDetailDrawer } from './components/SubnetDetailDrawer';
import { SubnetFormModal } from './components/SubnetFormModal';
import { SubnetManagementTab } from './components/SubnetManagementTab';
import { VlanDetailDrawer } from './components/VlanDetailDrawer';
import { VlanFormModal } from './components/VlanFormModal';
import { VlanManagementTab } from './components/VlanManagementTab';
import { useNetworkManagement } from './hooks/useNetworkManagement';

export default function NetworkPage() {
  const [form] = Form.useForm();
  const [subnetForm] = Form.useForm();
  const [vlanForm] = Form.useForm();

  const {
    // Entities
    vlans,
    subnets,
    ips,
    locations,
    assets,
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
  } = useNetworkManagement(form, subnetForm, vlanForm);

  const statsItems = useMemo(
    () => [
      {
        title: 'Active VLANs',
        value: stats.totalVlans || vlans.length,
        prefix: <ApartmentOutlined />,
        color: '#722ed1',
      },
      {
        title: 'Managed Subnets',
        value: stats.managedSubnets || subnets.length,
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
        title: 'Free IP Capacity',
        value: stats.freeIpCapacity || stats.availableIps,
        prefix: <GlobalOutlined />,
        color: '#059669',
      },
    ],
    [stats, vlans.length, subnets.length],
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
            subnets={subnets}
            vlans={vlans}
            locations={locations}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            siteFilter={siteFilter}
            onSiteChange={setSiteFilter}
            vlanFilter={vlanFilter}
            onVlanChange={setVlanFilter}
            subnetFilter={subnetFilter}
            onSubnetChange={setSubnetFilter}
            deviceTypeFilter={deviceTypeFilter}
            onDeviceTypeChange={setDeviceTypeFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onResetFilters={handleResetFilters}
            onOpenEditModal={handleOpenEditIpModal}
            onRevealCredential={handleRevealCredential}
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
        children: (
          <SubnetManagementTab
            subnets={subnets}
            vlans={vlans}
            locations={locations}
            loading={loading}
            onOpenCreateModal={handleOpenCreateSubnetModal}
            onOpenEditModal={handleOpenEditSubnetModal}
            onOpenDetailDrawer={handleOpenSubnetDrawer}
            onDeleteSubnet={handleDeleteSubnet}
          />
        ),
      },
      {
        key: 'vlans',
        label: (
          <span>
            <ApartmentOutlined /> VLANs ({vlans.length})
          </span>
        ),
        children: (
          <VlanManagementTab
            vlans={vlans}
            subnets={subnets}
            locations={locations}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            locationFilter={siteFilter}
            onLocationChange={setSiteFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onResetFilters={handleResetFilters}
            onOpenCreateModal={handleOpenCreateVlanModal}
            onOpenEditModal={handleOpenEditVlanModal}
            onOpenDetailDrawer={handleOpenVlanDrawer}
            onDeleteVlan={handleDeleteVlan}
          />
        ),
      },
    ],
    [
      ips,
      subnets,
      vlans,
      locations,
      loading,
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
      handleOpenEditIpModal,
      handleRevealCredential,
      handleDeleteIp,
      handleOpenCreateSubnetModal,
      handleOpenEditSubnetModal,
      handleOpenSubnetDrawer,
      handleDeleteSubnet,
      handleOpenCreateVlanModal,
      handleOpenEditVlanModal,
      handleOpenVlanDrawer,
      handleDeleteVlan,
    ],
  );

  return (
    <PageContainer
      title="Network & IPAM"
      subtitle="Enterprise management for IP allocations, subnet CIDR blocks, VLAN segmentation, and real-time network telemetry."
      breadcrumbs={[{ title: 'Network' }]}
      stats={statsItems}
      extra={
        <Flex gap={8}>
          <Tooltip title="Refresh network records">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button icon={<ApartmentOutlined />} onClick={handleOpenCreateVlanModal}>
            Create VLAN
          </Button>
          <Button icon={<CloudServerOutlined />} onClick={handleOpenCreateSubnetModal}>
            Create Subnet
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateIpModal}>
            Allocate IP
          </Button>
        </Flex>
      }
    >
      <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} items={tabItems} />

      {/* VLAN Modals & Drawers */}
      <VlanFormModal
        open={vlanModalOpen}
        editingVlan={editingVlan}
        form={vlanForm}
        submitting={modalSubmitting}
        locations={locations}
        onSave={handleSaveVlan}
        onCancel={() => setVlanModalOpen(false)}
      />

      <VlanDetailDrawer
        open={vlanDrawerOpen}
        vlan={selectedVlan}
        subnets={subnets}
        onClose={() => setVlanDrawerOpen(false)}
        onFilterSubnetsByVlan={handleFilterSubnetsByVlan}
        onFilterIpsByVlan={handleFilterIpsByVlan}
      />

      {/* Subnet Modals & Drawers */}
      <SubnetFormModal
        open={subnetModalOpen}
        editingSubnet={editingSubnet}
        form={subnetForm}
        submitting={modalSubmitting}
        vlans={vlans}
        locations={locations}
        onSave={handleSaveSubnet}
        onCancel={() => setSubnetModalOpen(false)}
      />

      <SubnetDetailDrawer
        open={subnetDrawerOpen}
        subnet={selectedSubnet}
        ips={ips}
        onClose={() => setSubnetDrawerOpen(false)}
        onFilterIpsBySubnet={handleFilterIpsBySubnet}
      />

      {/* IP Address Modal */}
      <IpFormModal
        open={ipModalOpen}
        editingIp={editingIp}
        form={form}
        submitting={modalSubmitting}
        subnets={subnets}
        vlans={vlans}
        locations={locations}
        assets={assets}
        onSave={handleSaveIp}
        onCancel={() => setIpModalOpen(false)}
      />

      <CredentialRevealModal
        open={credentialModalOpen}
        targetIp={targetIpForCredential}
        credential={revealedCredential}
        loading={credentialLoading}
        onClose={() => setCredentialModalOpen(false)}
      />
    </PageContainer>
  );
}
