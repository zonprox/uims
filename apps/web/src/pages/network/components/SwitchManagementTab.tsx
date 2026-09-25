import {
  ApartmentOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type Asset, assetsService } from '../../../services/assets.service';
import type { LocationBranch } from '../../../services/organization.service';
import { organizationService } from '../../../services/organization.service';
import type {
  CreateSwitchDto,
  IPAddress,
  NetworkRack,
  NetworkSwitch,
  Subnet,
  UpdateSwitchDto,
  VLAN,
} from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { SwitchFaceplateDrawer } from './SwitchFaceplateDrawer';
import { SwitchFormModal } from './SwitchFormModal';
import { SwitchTable } from './SwitchTable';

const { Text, Title } = Typography;

export interface SwitchManagementTabProps {
  switches?: Array<NetworkSwitch>;
  racks?: Array<NetworkRack>;
  locations?: Array<LocationBranch>;
  loading?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  siteFilter?: string;
  onSiteChange?: (val: string) => void;
  onResetFilters?: () => void;
  onOpenCreateModal?: () => void;
  onSelectRack?: (rackId: string) => void;
}

export const SwitchManagementTab: React.FC<SwitchManagementTabProps> = React.memo(
  ({
    switches: propSwitches,
    racks: propRacks,
    locations: propLocations,
    loading: propLoading = false,
    searchQuery: propSearchQuery,
    onSearchChange: propOnSearchChange,
    siteFilter: propSiteFilter,
    onSiteChange: propOnSiteChange,
    onResetFilters: propOnResetFilters,
    onOpenCreateModal: propOnOpenCreateModal,
    onSelectRack,
  }) => {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [form] = Form.useForm();

    // Internal state if not controlled by parent
    const [internalSearch, setInternalSearch] = useState('');
    const [internalSite, setInternalSite] = useState<string>('all');
    const [vendorFilter, setVendorFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const [internalSwitches, setInternalSwitches] = useState<Array<NetworkSwitch>>([]);
    const [internalRacks, setInternalRacks] = useState<Array<NetworkRack>>([]);
    const [internalLocations, setInternalLocations] = useState<Array<LocationBranch>>([]);
    const [internalAssets, setInternalAssets] = useState<Array<Asset>>([]);
    const [internalVlans, setInternalVlans] = useState<Array<VLAN>>([]);
    const [internalSubnets, setInternalSubnets] = useState<Array<Subnet>>([]);
    const [internalIps, setInternalIps] = useState<Array<IPAddress>>([]);
    const [internalLoading, setInternalLoading] = useState(false);

    // Modal & Drawer states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingSwitch, setEditingSwitch] = useState<NetworkSwitch | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [faceplateSwitch, setFaceplateSwitch] = useState<NetworkSwitch | null>(null);
    const [faceplateDrawerOpen, setFaceplateDrawerOpen] = useState(false);

    const activeSearch = propSearchQuery !== undefined ? propSearchQuery : internalSearch;
    const activeSite = propSiteFilter !== undefined ? propSiteFilter : internalSite;

    const handleSearchChange = (val: string) => {
      if (propOnSearchChange) {
        propOnSearchChange(val);
      } else {
        setInternalSearch(val);
      }
    };

    const handleSiteChange = (val: string) => {
      if (propOnSiteChange) {
        propOnSiteChange(val);
      } else {
        setInternalSite(val);
      }
    };

    const handleReset = () => {
      if (propOnResetFilters) {
        propOnResetFilters();
      } else {
        setInternalSearch('');
        setInternalSite('all');
      }
      setVendorFilter('all');
      setRoleFilter('all');
      setStatusFilter('all');
    };

    // Fetch switches, racks, locations, assets if not supplied
    const loadSwitches = useCallback(async () => {
      setInternalLoading(true);
      try {
        const [switchList, rackList, locList, assetList, vlanList, subnetList, ipList] =
          await Promise.all([
            networkService.getSwitches({
              search: activeSearch || undefined,
              locationId: activeSite !== 'all' ? activeSite : undefined,
              vendor: vendorFilter !== 'all' ? vendorFilter : undefined,
              role: roleFilter !== 'all' ? roleFilter : undefined,
              status: statusFilter !== 'all' ? statusFilter : undefined,
            }),
            propRacks ? Promise.resolve(propRacks) : networkService.getRacks(),
            propLocations ? Promise.resolve(propLocations) : organizationService.getLocations(),
            assetsService.getAssets().catch((_err: unknown) => []),
            networkService.getVlans().catch((_err: unknown) => []),
            networkService.getSubnets().catch((_err: unknown) => []),
            networkService.getIps().catch((_err: unknown) => []),
          ]);

        setInternalSwitches(switchList || []);
        if (!propRacks) setInternalRacks(rackList || []);
        if (!propLocations) setInternalLocations(locList || []);
        setInternalAssets(assetList || []);
        setInternalVlans(vlanList || []);
        setInternalSubnets(subnetList || []);
        setInternalIps(ipList || []);
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'load network switches'));
      } finally {
        setInternalLoading(false);
      }
    }, [
      activeSearch,
      activeSite,
      vendorFilter,
      roleFilter,
      statusFilter,
      propRacks,
      propLocations,
      message,
    ]);

    useEffect(() => {
      if (!propSwitches) {
        loadSwitches();
      }
    }, [propSwitches, loadSwitches]);

    // Active dataset
    const rawSwitches = propSwitches || internalSwitches;
    const effectiveRacks = propRacks || internalRacks;
    const effectiveLocations = propLocations || internalLocations;
    const effectiveLoading = propLoading || internalLoading;

    // In-memory filter on rawSwitches
    const filteredSwitches = useMemo(() => {
      return rawSwitches.filter((sw) => {
        // Search
        if (activeSearch) {
          const q = activeSearch.toLowerCase();
          const matchName = sw.name.toLowerCase().includes(q);
          const matchModel = sw.model.toLowerCase().includes(q);
          const matchVendor = sw.vendor.toLowerCase().includes(q);
          const matchSerial = (sw.serialNumber || '').toLowerCase().includes(q);
          const matchMac = (sw.macAddress || '').toLowerCase().includes(q);
          const matchIp = (sw.ipAddress?.address || '').toLowerCase().includes(q);
          if (!matchName && !matchModel && !matchVendor && !matchSerial && !matchMac && !matchIp) {
            return false;
          }
        }

        // Location / Site
        if (activeSite !== 'all') {
          if (sw.locationId !== activeSite && sw.location?.id !== activeSite) {
            return false;
          }
        }

        // Vendor
        if (vendorFilter !== 'all') {
          if (!sw.vendor.toLowerCase().includes(vendorFilter.toLowerCase())) {
            return false;
          }
        }

        // Role
        if (roleFilter !== 'all') {
          if (sw.role !== roleFilter) {
            return false;
          }
        }

        // Status
        if (statusFilter !== 'all') {
          if (sw.status !== statusFilter) {
            return false;
          }
        }

        return true;
      });
    }, [rawSwitches, activeSearch, activeSite, vendorFilter, roleFilter, statusFilter]);

    // Summary Telemetry Metrics
    const metrics = useMemo(() => {
      const totalSwitches = rawSwitches.length;
      let totalPorts = 0;
      let onlineCount = 0;
      let coreDistCount = 0;

      for (const sw of rawSwitches) {
        totalPorts += sw.totalPorts || 24;
        if (sw.status === 'ONLINE') onlineCount++;
        if (sw.role === 'CORE' || sw.role === 'DISTRIBUTION') coreDistCount++;
      }

      return { totalSwitches, totalPorts, onlineCount, coreDistCount };
    }, [rawSwitches]);

    // Actions
    const handleOpenCreate = () => {
      if (propOnOpenCreateModal) {
        propOnOpenCreateModal();
      } else {
        setEditingSwitch(null);
        form.resetFields();
        form.setFieldsValue({
          role: 'ACCESS',
          status: 'ONLINE',
          totalPorts: 24,
          rackHeight: 1,
          autoGeneratePorts: true,
        });
        setCreateModalOpen(true);
      }
    };

    const handleOpenEdit = (sw: NetworkSwitch) => {
      setEditingSwitch(sw);
      form.setFieldsValue({
        name: sw.name,
        vendor: sw.vendor,
        model: sw.model,
        role: sw.role,
        status: sw.status,
        totalPorts: sw.totalPorts,
        serialNumber: sw.serialNumber || '',
        macAddress: sw.macAddress || '',
        firmwareVersion: sw.firmwareVersion || '',
        locationId: sw.locationId || undefined,
        rackId: sw.rackId || undefined,
        rackPosition: sw.rackPosition || undefined,
        rackHeight: sw.rackHeight || 1,
        assetId: sw.assetId || undefined,
        notes: sw.notes || '',
      });
      setCreateModalOpen(true);
    };

    const handleSaveSwitch = async () => {
      try {
        const values = await form.validateFields();
        setSubmitting(true);

        if (editingSwitch) {
          const payload: UpdateSwitchDto = {
            name: values.name,
            vendor: values.vendor,
            model: values.model,
            role: values.role,
            status: values.status,
            totalPorts: values.totalPorts,
            serialNumber: values.serialNumber || null,
            macAddress: values.macAddress || null,
            firmwareVersion: values.firmwareVersion || null,
            locationId: values.locationId || null,
            rackId: values.rackId || null,
            rackPosition: values.rackPosition || null,
            rackHeight: values.rackHeight || 1,
            assetId: values.assetId || null,
            notes: values.notes || null,
          };
          await networkService.updateSwitch(editingSwitch.id, payload);
          message.success(`Switch "${values.name}" updated successfully`);
        } else {
          const payload: CreateSwitchDto = {
            name: values.name,
            vendor: values.vendor,
            model: values.model,
            role: values.role,
            status: values.status,
            totalPorts: values.totalPorts || 24,
            serialNumber: values.serialNumber || null,
            macAddress: values.macAddress || null,
            firmwareVersion: values.firmwareVersion || null,
            locationId: values.locationId || null,
            rackId: values.rackId || null,
            rackPosition: values.rackPosition || null,
            rackHeight: values.rackHeight || 1,
            assetId: values.assetId || null,
            notes: values.notes || null,
            autoGeneratePorts: Boolean(values.autoGeneratePorts),
          };
          await networkService.createSwitch(payload);
          message.success(`Switch "${values.name}" created successfully`);
        }

        setCreateModalOpen(false);
        setEditingSwitch(null);
        form.resetFields();
        await loadSwitches();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'save network switch'));
      } finally {
        setSubmitting(false);
      }
    };

    const handleDeleteSwitch = async (id: string) => {
      try {
        await networkService.deleteSwitch(id);
        message.success('Switch deleted successfully');
        await loadSwitches();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'delete switch'));
      }
    };

    const handleViewFaceplate = (sw: NetworkSwitch) => {
      setFaceplateSwitch(sw);
      setFaceplateDrawerOpen(true);
    };

    return (
      <Flex vertical gap={16}>
        {/* Header Title & Badges */}
        <Card styles={{ body: { padding: '16px 20px' } }}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Flex vertical gap={4}>
              <Flex align="center" gap={10}>
                <CloudServerOutlined style={{ fontSize: 22, color: '#1677ff' }} />
                <Title level={4} style={{ margin: 0 }}>
                  Switch Fleet & Port Matrix
                </Title>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Enterprise switch inventory across Cisco, Alcatel-Lucent, Juniper, and Mikrotik with
                interactive 24/48-port visual faceplates and tri-state link telemetry.
              </Text>
            </Flex>
            <Space>
              <Tag color="blue">24/48 Port Faceplates</Tag>
              <Tag color="green">Tri-State Link Status</Tag>
              <Tag color="orange">PoE & VLAN Matrix</Tag>
            </Space>
          </Flex>
        </Card>

        {/* KPI Summary Cards Bar */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card styles={{ body: { padding: '14px 16px' } }}>
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: '#e6f4ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: '#1677ff',
                  }}
                >
                  <CloudServerOutlined />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    Total Switches
                  </Text>
                  <Title level={4} style={{ margin: 0 }}>
                    {metrics.totalSwitches}
                  </Title>
                </div>
              </Flex>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card styles={{ body: { padding: '14px 16px' } }}>
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: '#f6ffed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: '#52c41a',
                  }}
                >
                  <ApiOutlined />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    Total Switch Ports
                  </Text>
                  <Title level={4} style={{ margin: 0 }}>
                    {metrics.totalPorts}
                  </Title>
                </div>
              </Flex>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card styles={{ body: { padding: '14px 16px' } }}>
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: '#f6ffed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: '#52c41a',
                  }}
                >
                  <CheckCircleOutlined />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    Online Operational
                  </Text>
                  <Title level={4} style={{ margin: 0 }}>
                    {metrics.onlineCount}
                  </Title>
                </div>
              </Flex>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card styles={{ body: { padding: '14px 16px' } }}>
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: '#f9f0ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: '#722ed1',
                  }}
                >
                  <ApartmentOutlined />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    Core & Distribution
                  </Text>
                  <Title level={4} style={{ margin: 0 }}>
                    {metrics.coreDistCount}
                  </Title>
                </div>
              </Flex>
            </Card>
          </Col>
        </Row>

        {/* Filter Toolbar */}
        <Card styles={{ body: { padding: '12px 16px' } }}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            {/* Left Filter Controls */}
            <Flex align="center" wrap="wrap" gap={8} style={{ flexGrow: 1 }}>
              <Input
                placeholder="Search switch name, model, serial, MAC, IP..."
                prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
                value={activeSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
                style={{ width: 280 }}
                data-testid="switch-search-input"
              />

              <Select
                value={vendorFilter}
                onChange={setVendorFilter}
                style={{ width: 140 }}
                data-testid="switch-vendor-filter"
                options={[
                  { label: 'All Vendors', value: 'all' },
                  { label: 'Cisco', value: 'Cisco' },
                  { label: 'Alcatel-Lucent', value: 'Alcatel' },
                  { label: 'Juniper', value: 'Juniper' },
                  { label: 'Aruba', value: 'Aruba' },
                  { label: 'Mikrotik', value: 'Mikrotik' },
                ]}
              />

              <Select
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 140 }}
                data-testid="switch-role-filter"
                options={[
                  { label: 'All Roles', value: 'all' },
                  { label: 'Core', value: 'CORE' },
                  { label: 'Distribution', value: 'DISTRIBUTION' },
                  { label: 'Access', value: 'ACCESS' },
                  { label: 'ToR', value: 'TOR' },
                ]}
              />

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 130 }}
                data-testid="switch-status-filter"
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Online', value: 'ONLINE' },
                  { label: 'Offline', value: 'OFFLINE' },
                  { label: 'Maintenance', value: 'MAINTENANCE' },
                ]}
              />

              <Select
                value={activeSite}
                onChange={handleSiteChange}
                style={{ width: 160 }}
                placeholder="All Locations"
                options={[
                  { label: 'All Locations', value: 'all' },
                  ...effectiveLocations.map((loc) => ({
                    label: loc.name,
                    value: loc.id,
                  })),
                ]}
              />

              {(activeSearch ||
                activeSite !== 'all' ||
                vendorFilter !== 'all' ||
                roleFilter !== 'all' ||
                statusFilter !== 'all') && (
                <Button icon={<ClearOutlined />} onClick={handleReset} size="middle">
                  Reset
                </Button>
              )}
            </Flex>

            {/* Right Action Controls */}
            <Space>
              <Tooltip title="Refresh switch list">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadSwitches}
                  loading={effectiveLoading}
                />
              </Tooltip>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                data-testid="add-switch-button"
              >
                Add Switch
              </Button>
            </Space>
          </Flex>
        </Card>

        {/* Switch Fleet Table Card */}
        <Card styles={{ body: { padding: 0 } }}>
          <SwitchTable
            switches={filteredSwitches}
            loading={effectiveLoading}
            onViewFaceplate={handleViewFaceplate}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteSwitch}
            onSelectRack={onSelectRack}
          />
        </Card>

        {/* Switch Form Modal (Create / Edit) */}
        <SwitchFormModal
          open={createModalOpen}
          editingSwitch={editingSwitch}
          form={form}
          submitting={submitting}
          locations={effectiveLocations}
          racks={effectiveRacks}
          assets={internalAssets}
          onSave={handleSaveSwitch}
          onCancel={() => {
            setCreateModalOpen(false);
            setEditingSwitch(null);
            form.resetFields();
          }}
        />

        {/* Interactive Visual Faceplate Drawer */}
        <SwitchFaceplateDrawer
          open={faceplateDrawerOpen}
          switchEntity={faceplateSwitch}
          onClose={() => {
            setFaceplateDrawerOpen(false);
            setFaceplateSwitch(null);
          }}
          onEditSwitch={(sw) => {
            setFaceplateDrawerOpen(false);
            handleOpenEdit(sw);
          }}
          onSelectRack={onSelectRack}
          locations={effectiveLocations}
          vlans={internalVlans}
          subnets={internalSubnets}
          ips={internalIps}
          assets={internalAssets}
        />
      </Flex>
    );
  },
);

SwitchManagementTab.displayName = 'SwitchManagementTab';
