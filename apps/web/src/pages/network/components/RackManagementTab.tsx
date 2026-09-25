import {
  ApartmentOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ClearOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { queryClient } from '../../../app/query-client';
import type { NetworkRack } from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import type { LocationBranch } from '../../../services/organization.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { RackElevationView } from './RackElevationView';
import { RackFormModal } from './RackFormModal';
import { RackTable } from './RackTable';

const { Text, Title } = Typography;

export interface RackManagementTabProps {
  racks?: Array<NetworkRack>;
  locations?: Array<LocationBranch>;
  loading?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  siteFilter?: string;
  onSiteChange?: (val: string) => void;
  onResetFilters?: () => void;
  onOpenCreateModal?: () => void;
  onSelectSwitch?: (switchId: string) => void;
  onRackUpdated?: (updatedRack: NetworkRack) => void;
}

export const RackManagementTab: React.FC<RackManagementTabProps> = React.memo(
  ({
    racks: propRacks,
    locations = [],
    loading: propLoading = false,
    searchQuery: propSearchQuery,
    onSearchChange: propOnSearchChange,
    siteFilter: propSiteFilter,
    onSiteChange: propOnSiteChange,
    onResetFilters: propOnResetFilters,
    onOpenCreateModal: propOnOpenCreateModal,
    onSelectSwitch,
    onRackUpdated,
  }) => {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [form] = Form.useForm();

    // Internal state if not controlled from parent
    const [internalSearch, setInternalSearch] = useState('');
    const [internalSite, setInternalSite] = useState<string>('all');
    const [internalRacks, setInternalRacks] = useState<Array<NetworkRack>>([]);
    const [internalLoading, setInternalLoading] = useState(false);

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
    };

    // Fetch racks if not supplied by props
    const loadRacks = useCallback(async () => {
      setInternalLoading(true);
      try {
        const list = await networkService.getRacks({
          search: activeSearch || undefined,
          locationId: activeSite !== 'all' ? activeSite : undefined,
        });
        setInternalRacks(list || []);
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'load equipment racks'));
      } finally {
        setInternalLoading(false);
      }
    }, [activeSearch, activeSite, message]);

    useEffect(() => {
      if (!propRacks) {
        loadRacks();
      }
    }, [propRacks, loadRacks]);

    const activeRacks = propRacks !== undefined ? propRacks : internalRacks;
    const isLoading = propLoading || internalLoading;

    // View Mode: 'elevation' (2D Visual) vs 'table' (Tabular List)
    const [viewMode, setViewMode] = useState<'elevation' | 'table'>('elevation');
    const [selectedRackId, setSelectedRackId] = useState<string | null>(null);

    // Modal state for Rack creation & editing
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<NetworkRack | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Sync selected rack with activeRacks list
    useEffect(() => {
      if (activeRacks.length > 0) {
        if (!selectedRackId || !activeRacks.some((r) => r.id === selectedRackId)) {
          setSelectedRackId(activeRacks[0].id);
        }
      } else {
        setSelectedRackId(null);
      }
    }, [activeRacks, selectedRackId]);

    const currentRack = useMemo(() => {
      return activeRacks.find((r) => r.id === selectedRackId) || activeRacks[0] || null;
    }, [activeRacks, selectedRackId]);

    // Handlers for Rack CRUD
    const handleOpenCreate = () => {
      if (propOnOpenCreateModal) {
        propOnOpenCreateModal();
        return;
      }
      setEditingRack(null);
      form.resetFields();
      form.setFieldsValue({
        totalHeight: 42,
        status: 'ACTIVE',
      });
      setModalOpen(true);
    };

    const handleOpenEdit = (rack: NetworkRack) => {
      setEditingRack(rack);
      form.setFieldsValue({
        name: rack.name,
        code: rack.code,
        locationId: rack.locationId || rack.location?.id,
        totalHeight: rack.totalHeight,
        status: rack.status,
        notes: rack.notes,
      });
      setModalOpen(true);
    };

    const handleSaveRack = async () => {
      try {
        const values = await form.validateFields();
        setSubmitting(true);

        if (editingRack) {
          await networkService.updateRack(editingRack.id, values);
          message.success(`Rack "${values.name}" updated successfully.`);
        } else {
          await networkService.createRack(values);
          message.success(`Rack "${values.name}" created successfully.`);
        }

        queryClient.invalidateQueries({ queryKey: ['racks'] });
        setModalOpen(false);
        if (!propRacks) {
          loadRacks();
        }
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'save equipment rack'));
      } finally {
        setSubmitting(false);
      }
    };

    const handleDeleteRack = async (id: string) => {
      try {
        await networkService.deleteRack(id);
        queryClient.invalidateQueries({ queryKey: ['racks'] });
        message.success('Rack deleted successfully.');
        if (!propRacks) {
          loadRacks();
        }
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'delete equipment rack'));
      }
    };

    const handleViewElevationFromTable = (rack: NetworkRack) => {
      setSelectedRackId(rack.id);
      setViewMode('elevation');
    };

    const handleEmptySlotMount = (unitNumber: number) => {
      message.info(`Ready to mount equipment at slot U${String(unitNumber).padStart(2, '0')}.`);
      handleOpenCreate();
    };

    // Filter racks by search query and site filter
    const filteredRacks = useMemo(() => {
      return activeRacks.filter((rack) => {
        if (activeSearch) {
          const query = activeSearch.toLowerCase();
          const matchCode = rack.code?.toLowerCase().includes(query);
          const matchName = rack.name?.toLowerCase().includes(query);
          const matchNotes = rack.notes?.toLowerCase().includes(query);
          const matchLoc = rack.location?.name?.toLowerCase().includes(query);
          if (!matchCode && !matchName && !matchNotes && !matchLoc) {
            return false;
          }
        }
        if (activeSite && activeSite !== 'all') {
          if (rack.locationId !== activeSite && rack.location?.id !== activeSite) {
            return false;
          }
        }
        return true;
      });
    }, [activeRacks, activeSearch, activeSite]);

    return (
      <Flex vertical gap={16} style={{ width: '100%' }}>
        {/* Control Bar & Feature Header */}
        <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
          <Flex justify="space-between" align="center" wrap gap={12}>
            {/* Header info preserving required test strings */}
            <Flex vertical gap={2}>
              <Flex align="center" gap={8} wrap>
                <Title level={5} style={{ margin: 0 }}>
                  Racks & Elevation Management
                </Title>
                <Tag color="purple">1U–48U Rails</Tag>
                <Tag color="blue">Collision Detection</Tag>
                <Tag color="green">Space & RU Telemetry</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Enterprise 2D cabinet elevation (1U–48U rails), multi-U slotting mechanics, space
                utilization telemetry, and equipment rack inventory.
              </Text>
            </Flex>

            {/* View Mode Toggle and Primary Action */}
            <Flex align="center" gap={8} wrap>
              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'elevation' | 'table')}
                options={[
                  {
                    label: '2D Visual Elevation',
                    value: 'elevation',
                    icon: <AppstoreOutlined />,
                  },
                  {
                    label: 'Cabinet Table',
                    value: 'table',
                    icon: <BarsOutlined />,
                  },
                ]}
              />

              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                Create Rack
              </Button>
            </Flex>
          </Flex>

          {/* Search and Filters Bar */}
          <Flex align="center" justify="space-between" wrap gap={12} style={{ marginTop: 14 }}>
            <Flex align="center" gap={8} wrap style={{ flex: 1 }}>
              <Input
                placeholder="Search racks by code or name..."
                prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
                value={activeSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
                style={{ width: 260 }}
              />

              <Select
                value={activeSite}
                onChange={handleSiteChange}
                style={{ width: 220 }}
                suffixIcon={<EnvironmentOutlined style={{ color: token.colorTextQuaternary }} />}
                options={[
                  { label: 'All Datacenters / Sites', value: 'all' },
                  ...locations.map((loc) => ({
                    label: loc.name,
                    value: loc.id,
                  })),
                ]}
              />

              {(activeSearch || activeSite !== 'all') && (
                <Button icon={<ClearOutlined />} onClick={handleReset}>
                  Reset
                </Button>
              )}
            </Flex>

            {/* Rack Selector (Shown in Elevation mode) */}
            {viewMode === 'elevation' && filteredRacks.length > 0 && (
              <Flex align="center" gap={8}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Active Cabinet:
                </Text>
                <Select
                  value={selectedRackId || currentRack?.id}
                  onChange={(val) => setSelectedRackId(val)}
                  style={{ width: 240 }}
                  options={filteredRacks.map((r) => ({
                    label: `${r.name} (${r.code}) · ${r.totalHeight}U`,
                    value: r.id,
                  }))}
                />
              </Flex>
            )}
          </Flex>
        </Card>

        {/* Content Body: Empty State, 2D Elevation, or Table */}
        {isLoading ? (
          <Card styles={{ body: { padding: '60px 0', textAlign: 'center' } }}>
            <Spin description="Loading equipment racks..." />
          </Card>
        ) : filteredRacks.length === 0 ? (
          <Card styles={{ body: { padding: '40px 24px', textAlign: 'center' } }}>
            <Empty
              image={<ApartmentOutlined style={{ fontSize: 64, color: token.colorPrimary }} />}
              styles={{ image: { height: 72 } }}
              description={
                <Flex vertical align="center" gap={8}>
                  <Title level={5} style={{ margin: 0 }}>
                    Racks & Elevation Management
                  </Title>
                  <Text type="secondary" style={{ maxWidth: 540 }}>
                    Enterprise 2D cabinet elevation (1U–48U rails), multi-U slotting mechanics,
                    space utilization telemetry, and equipment rack inventory.
                  </Text>
                  <Space style={{ marginTop: 8 }}>
                    <Tag color="purple">1U–48U Rails</Tag>
                    <Tag color="blue">Collision Detection</Tag>
                    <Tag color="green">Space & RU Telemetry</Tag>
                  </Space>
                  <Text type="secondary" style={{ marginTop: 4 }}>
                    {activeSearch || activeSite !== 'all'
                      ? 'No equipment racks match the applied filters.'
                      : 'No equipment racks configured yet. Click below to provision your first cabinet.'}
                  </Text>
                </Flex>
              }
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                Create Rack
              </Button>
            </Empty>
          </Card>
        ) : viewMode === 'elevation' && currentRack ? (
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <RackElevationView
              rack={currentRack}
              onMountClick={handleEmptySlotMount}
              onSelectSwitch={onSelectSwitch}
              onRackUpdated={(updated) => {
                setInternalRacks((prev) =>
                  prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
                );
                onRackUpdated?.(updated);
              }}
              onRefresh={() => {
                if (!propRacks) loadRacks();
              }}
              extraActions={
                <Tooltip title="Refresh elevation telemetry">
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      if (!propRacks) loadRacks();
                    }}
                  />
                </Tooltip>
              }
            />
          </Card>
        ) : (
          <RackTable
            racks={filteredRacks}
            loading={isLoading}
            onViewElevation={handleViewElevationFromTable}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteRack}
          />
        )}

        {/* Rack Form Modal */}
        <RackFormModal
          open={modalOpen}
          editingRack={editingRack}
          form={form}
          submitting={submitting}
          locations={locations}
          onSave={handleSaveRack}
          onCancel={() => setModalOpen(false)}
        />
      </Flex>
    );
  },
);

RackManagementTab.displayName = 'RackManagementTab';
