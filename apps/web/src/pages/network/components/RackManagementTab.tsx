import {
  ApartmentOutlined,
  ClearOutlined,
  PlusOutlined,
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
  Space,
  Spin,
  Tag,
  theme,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { queryClient } from '../../../app/query-client';
import type { NetworkRack } from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { isValidationError } from '../../../utils/formValidators';
import { RackElevationDrawer } from './RackElevationDrawer';
import { RackFormModal } from './RackFormModal';
import { RackTable } from './RackTable';

const { Text, Title } = Typography;

export interface RackManagementTabProps {
  racks?: Array<NetworkRack>;
  loading?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onResetFilters?: () => void;
  onOpenCreateModal?: () => void;
  onSelectSwitch?: (switchId: string) => void;
  onRackUpdated?: (updatedRack: NetworkRack) => void;
}

export const RackManagementTab: React.FC<RackManagementTabProps> = React.memo(
  ({
    racks: propRacks,
    loading: propLoading = false,
    searchQuery: propSearchQuery,
    onSearchChange: propOnSearchChange,
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
    const [internalRacks, setInternalRacks] = useState<Array<NetworkRack>>([]);
    const [internalLoading, setInternalLoading] = useState(false);

    const activeSearch = propSearchQuery !== undefined ? propSearchQuery : internalSearch;

    const handleSearchChange = (val: string) => {
      if (propOnSearchChange) {
        propOnSearchChange(val);
      } else {
        setInternalSearch(val);
      }
    };

    const handleReset = () => {
      if (propOnResetFilters) {
        propOnResetFilters();
      } else {
        setInternalSearch('');
      }
    };

    // Fetch racks if not supplied by props
    const loadRacks = useCallback(async () => {
      setInternalLoading(true);
      try {
        const list = await networkService.getRacks({
          search: activeSearch || undefined,
        });
        setInternalRacks(list || []);
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'load equipment racks'));
      } finally {
        setInternalLoading(false);
      }
    }, [activeSearch, message]);

    useEffect(() => {
      if (!propRacks) {
        loadRacks();
      }
    }, [propRacks, loadRacks]);

    // Drawer state for on-demand 2D visual elevation
    const [elevationDrawerOpen, setElevationDrawerOpen] = useState(false);
    const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
    const [fallbackRack, setFallbackRack] = useState<NetworkRack | null>(null);

    const activeRacks = useMemo(() => {
      const base = propRacks !== undefined ? propRacks : internalRacks;
      if (!fallbackRack) return base;
      return base.map((r) => (r.id === fallbackRack.id ? { ...r, ...fallbackRack } : r));
    }, [propRacks, internalRacks, fallbackRack]);
    const isLoading = propLoading || internalLoading;

    const selectedRack = useMemo(() => {
      if (!selectedRackId) return null;
      return activeRacks.find((r) => r.id === selectedRackId) || fallbackRack || null;
    }, [activeRacks, selectedRackId, fallbackRack]);

    // Modal state for Rack creation & editing
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<NetworkRack | null>(null);
    const [submitting, setSubmitting] = useState(false);

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
          const updated = await networkService.updateRack(editingRack.id, values);
          message.success(`Rack "${values.name}" updated successfully.`);
          setInternalRacks((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
          );
          setFallbackRack((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
          onRackUpdated?.(updated);
        } else {
          const created = await networkService.createRack(values);
          message.success(`Rack "${values.name}" created successfully.`);
          setInternalRacks((prev) => [created, ...prev]);
          onRackUpdated?.(created);
        }

        queryClient.invalidateQueries({ queryKey: ['racks'] });
        setModalOpen(false);
        if (!propRacks) {
          loadRacks();
        }
      } catch (err: unknown) {
        if (isValidationError(err)) return;
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
        setInternalRacks((prev) => prev.filter((r) => r.id !== id));
        if (selectedRackId === id) {
          setElevationDrawerOpen(false);
          setSelectedRackId(null);
          setFallbackRack(null);
        }
        if (!propRacks) {
          loadRacks();
        }
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'delete equipment rack'));
      }
    };

    const handleViewElevationFromTable = (rack: NetworkRack) => {
      setSelectedRackId(rack.id);
      setFallbackRack((prev) => (prev?.id === rack.id ? { ...rack, ...prev } : rack));
      setElevationDrawerOpen(true);
    };

    const handleEmptySlotMount = (unitNumber: number) => {
      message.info(`Ready to mount equipment at slot U${String(unitNumber).padStart(2, '0')}.`);
      handleOpenCreate();
    };

    // Filter racks by search query
    const filteredRacks = useMemo(() => {
      return activeRacks.filter((rack) => {
        if (activeSearch) {
          const query = activeSearch.toLowerCase();
          const matchCode = rack.code?.toLowerCase().includes(query);
          const matchName = rack.name?.toLowerCase().includes(query);
          const matchNotes = rack.notes?.toLowerCase().includes(query);
          if (!matchCode && !matchName && !matchNotes) {
            return false;
          }
        }
        return true;
      });
    }, [activeRacks, activeSearch]);

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

            {/* Primary Action */}
            <Flex align="center" gap={8} wrap>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                Create Rack
              </Button>
            </Flex>
          </Flex>

          {/* Search Bar */}
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

              {activeSearch && (
                <Button icon={<ClearOutlined />} onClick={handleReset}>
                  Reset
                </Button>
              )}
            </Flex>
          </Flex>
        </Card>

        {/* Content Body: Empty State or Table */}
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
                    {activeSearch
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
          onSave={handleSaveRack}
          onCancel={() => setModalOpen(false)}
        />

        {/* On-Demand 2D Visual Rack Elevation Drawer */}
        <RackElevationDrawer
          open={elevationDrawerOpen}
          rack={selectedRack}
          onClose={() => {
            setElevationDrawerOpen(false);
          }}
          onEditRack={(rack) => {
            setElevationDrawerOpen(false);
            handleOpenEdit(rack);
          }}
          onMountClick={handleEmptySlotMount}
          onSelectSwitch={(switchId) => {
            setElevationDrawerOpen(false);
            onSelectSwitch?.(switchId);
          }}
          onRefresh={() => {
            if (!propRacks) loadRacks();
          }}
        />
      </Flex>
    );
  },
);

RackManagementTab.displayName = 'RackManagementTab';
