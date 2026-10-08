import {
  ApartmentOutlined,
  ApiOutlined,
  CloudServerOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Flex, Form, Tabs, Tooltip } from 'antd';
import { useMemo } from 'react';
import PageContainer from '../../components/PageContainer';
import { IpAddressTable } from './components/IpAddressTable';
import { IpFormModal } from './components/IpFormModal';
import { RackManagementTab } from './components/RackManagementTab';
import { SubnetDetailDrawer } from './components/SubnetDetailDrawer';
import { SubnetFormModal } from './components/SubnetFormModal';
import { SubnetManagementTab } from './components/SubnetManagementTab';
import { SwitchManagementTab } from './components/SwitchManagementTab';
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
    assets,
    directoryUsers,
    stats,
    loading,
    activeTabKey,
    setActiveTabKey,

    // Filters
    searchQuery,
    setSearchQuery,
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

    // General
    loadData,
  } = useNetworkManagement(form, subnetForm, vlanForm);

  const statsItems = useMemo(
    () => [
      {
        title: 'Total Racks',
        value: stats.totalRacks ?? 0,
        prefix: <ApartmentOutlined />,
        color: '#722ed1',
      },
      {
        title: 'Total Switches',
        value: stats.totalSwitches ?? 0,
        prefix: <CloudServerOutlined />,
        color: '#1677ff',
      },
      {
        title: 'Total Ports',
        value: stats.totalPorts ?? 0,
        prefix: <ApiOutlined />,
        color: '#10b981',
      },
      {
        title: 'Port Utilization',
        value: stats.portUtilization !== undefined ? `${stats.portUtilization}%` : '0%',
        prefix: <GlobalOutlined />,
        color: '#059669',
      },
    ],
    [stats],
  );

  const tabItems = useMemo(
    () => [
      {
        key: 'racks',
        icon: <ApartmentOutlined />,
        label: 'Racks & Elevation',
        children: (
          <RackManagementTab
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onResetFilters={handleResetFilters}
            onSelectSwitch={() => setActiveTabKey('switches')}
          />
        ),
      },
      {
        key: 'switches',
        icon: <CloudServerOutlined />,
        label: 'Switches',
        children: (
          <SwitchManagementTab
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onResetFilters={handleResetFilters}
            onSelectRack={() => setActiveTabKey('racks')}
          />
        ),
      },
      {
        key: 'ipam',
        icon: <ApiOutlined />,
        label: `IP Allocations (${ips.length})`,
        forceRender: true,
        children: (
          <IpAddressTable
            ips={ips}
            subnets={subnets}
            vlans={vlans}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
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
            onDeleteIp={handleDeleteIp}
            onSelectSwitchPort={() => setActiveTabKey('switches')}
          />
        ),
      },
      {
        key: 'subnets',
        icon: <CloudServerOutlined />,
        label: `Subnets (${subnets.length})`,
        children: (
          <SubnetManagementTab
            subnets={subnets}
            vlans={vlans}
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
        icon: <ApartmentOutlined />,
        label: `VLANs (${vlans.length})`,
        children: (
          <VlanManagementTab
            vlans={vlans}
            subnets={subnets}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
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
      loading,
      searchQuery,
      setSearchQuery,
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
      title="Network"
      subtitle="Enterprise rack elevation, switch fleet inventory, interactive port matrix, and IPAM lifecycle."
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
        onViewPort={() => setActiveTabKey('switches')}
      />

      {/* Subnet Modals & Drawers */}
      <SubnetFormModal
        open={subnetModalOpen}
        editingSubnet={editingSubnet}
        form={subnetForm}
        submitting={modalSubmitting}
        vlans={vlans}
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
        assets={assets}
        directoryUsers={directoryUsers}
        onSave={handleSaveIp}
        onCancel={() => setIpModalOpen(false)}
      />
    </PageContainer>
  );
}
