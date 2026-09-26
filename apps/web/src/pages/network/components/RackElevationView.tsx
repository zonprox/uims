import {
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  MinusOutlined,
  PlusOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  InputNumber,
  Progress,
  Segmented,
  Space,
  Spin,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { queryClient } from '../../../app/query-client';
import type {
  NetworkRack,
  RackElevationData,
  SwitchRole,
  SwitchStatus,
} from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { formatErrorMessage } from '../../../utils/feedback';

const { Text, Title } = Typography;

export interface MountedDeviceSummary {
  id: string;
  name: string;
  model: string;
  vendor: string;
  role: SwitchRole | `${SwitchRole}`;
  status: SwitchStatus | `${SwitchStatus}`;
  rackHeight: number;
  rackPosition?: number | null;
  totalPorts?: number;
  activePortsCount?: number;
  unitHeight?: number;
  startUnit?: number;
}

export interface RackElevationViewProps {
  rack: NetworkRack;
  elevationData?: RackElevationData | null;
  loading?: boolean;
  onMountClick?: (unitNumber: number) => void;
  onSelectSwitch?: (switchId: string) => void;
  onDeviceClick?: (device: MountedDeviceSummary) => void;
  onRefresh?: () => void;
  onRackUpdated?: (updatedRack: NetworkRack) => void;
  onDeviceUnmounted?: (deviceId: string) => void;
  extraActions?: React.ReactNode;
}

const UNIT_HEIGHT_PX = 28;

export const RackElevationView: React.FC<RackElevationViewProps> = React.memo(
  ({
    rack,
    elevationData: propElevationData,
    loading: propLoading = false,
    onMountClick,
    onSelectSwitch,
    onDeviceClick,
    onRefresh,
    onRackUpdated,
    onDeviceUnmounted,
    extraActions,
  }) => {
    const { message } = App.useApp();
    const { token } = theme.useToken();

    const [viewMode, setViewMode] = useState<'front' | 'rear'>('front');
    const [sttOrder, setSttOrder] = useState<'asc' | 'desc'>('asc');
    const [fetchedElevation, setFetchedElevation] = useState<RackElevationData | null>(null);
    const [fetching, setFetching] = useState(false);
    const [hoveredUnit, setHoveredUnit] = useState<number | null>(null);
    const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);

    // Dynamic slot capacity state
    const [capacity, setCapacity] = useState<number>(rack.totalHeight || 42);
    const [inputCapacity, setInputCapacity] = useState<number | null>(rack.totalHeight || 42);
    const [updatingCapacity, setUpdatingCapacity] = useState(false);
    const updatingRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      const height = rack.totalHeight || 42;
      setCapacity(height);
      setInputCapacity(height);
    }, [rack.id, rack.totalHeight]);

    // Fetch elevation data safely ignoring resolution if unmounted
    const fetchElevation = useCallback(async () => {
      if (!rack.id || propElevationData) return;
      setFetching(true);
      try {
        const data = await networkService.getRackElevation(rack.id);
        if (!isMountedRef.current) return;
        setFetchedElevation(data);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        setFetchedElevation(null);
        message.error(formatErrorMessage(err, 'fetch rack elevation data'));
      } finally {
        if (isMountedRef.current) {
          setFetching(false);
        }
      }
    }, [rack.id, propElevationData, message]);

    useEffect(() => {
      if (propElevationData) {
        setFetchedElevation(propElevationData);
        return;
      }
      fetchElevation();
    }, [propElevationData, fetchElevation]);

    const activeElevation = propElevationData || fetchedElevation;
    const totalHeight = capacity || rack.totalHeight || activeElevation?.totalHeight || 42;

    // Helper to extract mounted devices from active elevation or rack switches
    const extractMountedDevices = useCallback(
      (
        elevation: RackElevationData | null,
        switches: NetworkRack['switches'],
      ): MountedDeviceSummary[] => {
        const found = new Map<string, MountedDeviceSummary>();

        if (elevation?.slots && elevation.slots.length > 0) {
          for (const slot of elevation.slots) {
            if (slot.isOccupied && slot.switch) {
              const sw = slot.switch;
              const pos = sw.rackPosition ?? slot.occupiedByUnit ?? slot.unitNumber ?? undefined;
              if (!found.has(sw.id)) {
                found.set(sw.id, {
                  id: sw.id,
                  name: sw.name,
                  model: sw.model,
                  vendor: sw.vendor,
                  role: sw.role,
                  status: sw.status,
                  rackHeight: sw.rackHeight || 1,
                  rackPosition: pos,
                  totalPorts: sw.totalPorts,
                  activePortsCount: sw.activePortsCount,
                  unitHeight: sw.rackHeight || 1,
                  startUnit: pos,
                });
              }
            }
          }
        }

        if (switches && switches.length > 0) {
          for (const s of switches) {
            const isAssignedToRack = !s.rackId || s.rackId === rack.id || s.rackPosition !== null;
            if (isAssignedToRack && !found.has(s.id)) {
              found.set(s.id, {
                id: s.id,
                name: s.name,
                model: s.model,
                vendor: s.vendor,
                role: s.role,
                status: s.status,
                rackHeight: s.rackHeight || 1,
                rackPosition: s.rackPosition ?? undefined,
                totalPorts: s.totalPorts,
                activePortsCount: s.activePortsCount,
                unitHeight: s.rackHeight || 1,
                startUnit: s.rackPosition ?? undefined,
              });
            }
          }
        }

        return Array.from(found.values());
      },
      [rack.id],
    );

    const initialDevices = extractMountedDevices(activeElevation, rack.switches);
    const [devices, setDevices] = useState<MountedDeviceSummary[]>(initialDevices);
    const devicesRef = useRef<MountedDeviceSummary[]>(initialDevices);
    const [busyDeviceIds, setBusyDeviceIds] = useState<Set<string>>(() => new Set());
    const busyDeviceIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
      const extracted = extractMountedDevices(activeElevation, rack.switches);
      setDevices(extracted);
      devicesRef.current = extracted;
    }, [activeElevation, rack.switches, extractMountedDevices]);

    // Total physical equipment height mounted in cabinet
    const totalEquipmentHeight = useMemo(() => {
      let sum = 0;
      for (const dev of devices) {
        sum += Math.max(1, Math.round(dev.rackHeight || 1));
      }
      return sum;
    }, [devices]);

    // Highest unit occupied by devices with explicit positions
    const maxPositionedUnit = useMemo(() => {
      let max = 0;
      for (const dev of devices) {
        if (dev.rackPosition && dev.rackPosition > 0) {
          const end = dev.rackPosition + Math.max(1, Math.round(dev.rackHeight || 1)) - 1;
          if (end > max) max = end;
        }
      }
      return max;
    }, [devices]);

    // Streamlined Telemetry calculations based on mounted devices
    const occupiedUnitsCount = totalEquipmentHeight;
    const availableUnits = Math.max(0, totalHeight - occupiedUnitsCount);
    const spaceUtilPercent =
      totalHeight > 0 ? Number(((occupiedUnitsCount / totalHeight) * 100).toFixed(1)) : 0;

    const minCapacity = Math.max(1, maxPositionedUnit, totalEquipmentHeight);
    const canDecrement = capacity > minCapacity;

    // Handle capacity change via API
    const handleUpdateCapacity = async (newHeight: number | null) => {
      if (newHeight === null || newHeight === undefined || Number.isNaN(newHeight)) {
        setInputCapacity(capacity);
        return;
      }
      if (!Number.isInteger(newHeight)) {
        newHeight = Math.round(newHeight);
      }
      if (newHeight < minCapacity) {
        message.error(
          `Cannot decrease rack capacity below U${minCapacity} (occupied by mounted devices).`,
        );
        setInputCapacity(capacity);
        return;
      }
      if (newHeight > 100) {
        message.error('Rack capacity cannot exceed 100 RU.');
        setInputCapacity(capacity);
        return;
      }
      if (newHeight === capacity) {
        setInputCapacity(capacity);
        return;
      }
      if (updatingRef.current) return;

      updatingRef.current = true;
      setUpdatingCapacity(true);
      try {
        const updated = await networkService.updateRack(rack.id, { totalHeight: newHeight });
        setCapacity(newHeight);
        setInputCapacity(newHeight);
        message.success(`Rack capacity updated to ${newHeight}U.`);
        onRackUpdated?.(updated);
        onRefresh?.();
        queryClient.invalidateQueries({ queryKey: ['racks'] });
        queryClient.invalidateQueries({ queryKey: ['rack-elevation', rack.id] });
        await fetchElevation();
      } catch (err: unknown) {
        setInputCapacity(capacity);
        message.error(formatErrorMessage(err, 'update rack capacity'));
      } finally {
        updatingRef.current = false;
        setUpdatingCapacity(false);
      }
    };

    // Devices sorted top-to-bottom sequentially (1..N)
    const sortedDevices = useMemo(() => {
      return [...devices].sort((a, b) => {
        const posA = a.rackPosition ?? 0;
        const posB = b.rackPosition ?? 0;
        if (posA !== posB) {
          return posB - posA;
        }
        return a.id.localeCompare(b.id);
      });
    }, [devices]);

    // Precompute automated sequential layout and rail unit allocations
    const positionedDevices = useMemo(() => {
      // Track units occupied by devices with explicit positions
      const reservedUnits = new Set<number>();
      for (const dev of sortedDevices) {
        if (dev.rackPosition && dev.rackPosition > 0) {
          const h = Math.max(1, Math.round(dev.rackHeight || 1));
          for (let u = dev.rackPosition; u < dev.rackPosition + h; u++) {
            reservedUnits.add(u);
          }
        }
      }

      // Ensure effective allocation height can accommodate all mounted equipment without visual overlaps
      const effectiveAllocationHeight = Math.max(
        totalHeight,
        maxPositionedUnit,
        totalEquipmentHeight,
      );
      let topCursor = effectiveAllocationHeight;

      return sortedDevices.map((device, index) => {
        const devHeightU = Math.max(1, Math.round(device.rackHeight || 1));
        let startU: number;
        let endU: number;

        if (device.rackPosition && device.rackPosition > 0) {
          startU = Math.round(device.rackPosition);
          endU = startU + devHeightU - 1;
        } else {
          // Find next available contiguous slot range of devHeightU units from topCursor down
          while (topCursor >= devHeightU) {
            let conflict = false;
            for (let u = topCursor; u >= topCursor - devHeightU + 1; u--) {
              if (reservedUnits.has(u)) {
                conflict = true;
                topCursor = u - 1;
                break;
              }
            }
            if (!conflict) {
              break;
            }
          }

          if (topCursor >= devHeightU) {
            endU = topCursor;
            startU = topCursor - devHeightU + 1;
          } else {
            endU = Math.max(1, topCursor);
            startU = Math.max(1, endU - devHeightU + 1);
          }

          topCursor = startU - 1;

          // Reserve newly allocated units to prevent subsequent collisions
          for (let u = startU; u <= endU; u++) {
            reservedUnits.add(u);
          }
        }

        const spannedUnits: number[] = [];
        for (let u = endU; u >= startU; u--) {
          spannedUnits.push(u);
        }

        const sttNumber = sttOrder === 'asc' ? index + 1 : sortedDevices.length - index;
        const sttLabel = `#${String(sttNumber).padStart(2, '0')}`;

        return {
          device,
          index,
          sttNumber,
          sttLabel,
          devHeightU,
          startU,
          endU,
          spannedUnits,
          pixelHeight: devHeightU * UNIT_HEIGHT_PX,
        };
      });
    }, [sortedDevices, totalHeight, sttOrder, maxPositionedUnit, totalEquipmentHeight]);

    // Unmount device handler with immediate UI state reflection and concurrency lock
    const handleUnmountDevice = useCallback(
      async (device: MountedDeviceSummary, e?: React.SyntheticEvent) => {
        e?.stopPropagation();
        if (busyDeviceIdsRef.current.has(device.id)) return;

        busyDeviceIdsRef.current.add(device.id);
        setBusyDeviceIds(new Set(busyDeviceIdsRef.current));

        devicesRef.current = devicesRef.current.filter((d) => d.id !== device.id);
        setDevices(devicesRef.current);
        message.success(`Unmounted ${device.name} from rack.`);
        onDeviceUnmounted?.(device.id);

        try {
          await networkService.updateSwitch(device.id, {
            rackPosition: null,
            rackId: null,
          });
          queryClient.invalidateQueries({ queryKey: ['racks'] });
          queryClient.invalidateQueries({ queryKey: ['rack-elevation', rack.id] });
          onRefresh?.();
        } catch (err: unknown) {
          devicesRef.current = [...devicesRef.current, device];
          setDevices(devicesRef.current);
          message.error(formatErrorMessage(err, 'unmount device'));
        } finally {
          busyDeviceIdsRef.current.delete(device.id);
          setBusyDeviceIds(new Set(busyDeviceIdsRef.current));
        }
      },
      [message, onDeviceUnmounted, onRefresh, rack.id],
    );

    // Find first unoccupied unit bottom-up for mounting new equipment
    const findFirstAvailableUnit = useCallback(() => {
      const occupiedUnits = new Set<number>();
      for (const item of positionedDevices) {
        for (const u of item.spannedUnits) {
          occupiedUnits.add(u);
        }
      }
      for (let u = 1; u <= totalHeight; u++) {
        if (!occupiedUnits.has(u)) {
          return u;
        }
      }
      return 1;
    }, [positionedDevices, totalHeight]);

    const handleMountEquipment = useCallback(() => {
      if (availableUnits <= 0) {
        message.warning(
          'Cabinet is fully occupied. Increase rack capacity or unmount existing equipment to mount new devices.',
        );
        return;
      }
      const targetUnit = findFirstAvailableUnit();
      onMountClick?.(targetUnit);
    }, [availableUnits, findFirstAvailableUnit, message, onMountClick]);

    const handleDeviceClick = (device: MountedDeviceSummary) => {
      onSelectSwitch?.(device.id);
      onDeviceClick?.(device);
    };

    const getRoleTagColor = (role: SwitchRole | `${SwitchRole}`) => {
      switch (role) {
        case 'CORE':
          return 'purple';
        case 'DISTRIBUTION':
          return 'blue';
        case 'ACCESS':
          return 'cyan';
        case 'TOR':
          return 'gold';
        default:
          return 'default';
      }
    };

    const getStatusIndicator = (status: SwitchStatus | `${SwitchStatus}`) => {
      switch (status) {
        case 'ONLINE':
          return <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 11 }} />;
        case 'OFFLINE':
          return <CloseCircleOutlined style={{ color: token.colorError, fontSize: 11 }} />;
        case 'MAINTENANCE':
          return <AlertOutlined style={{ color: token.colorWarning, fontSize: 11 }} />;
        default:
          return <CheckCircleOutlined style={{ color: token.colorTextTertiary, fontSize: 11 }} />;
      }
    };

    const isLoading = propLoading || fetching;

    return (
      <Spin spinning={isLoading}>
        <Flex vertical gap={16} style={{ width: '100%' }}>
          {/* Header & View Mode Switcher + Inline Quick-Stepper + Action Controls */}
          <Flex justify="space-between" align="center" wrap gap={12}>
            <Flex vertical gap={2}>
              <Flex align="center" gap={8} wrap>
                <Title level={4} style={{ margin: 0 }}>
                  {rack.name}
                </Title>
                <Tag color="purple" style={{ fontFamily: 'monospace' }}>
                  {rack.code}
                </Tag>
                <Tag color="blue">{totalHeight}U Standard</Tag>
                {rack.location && <Tag>{rack.location.name}</Tag>}
              </Flex>
              <Text type="secondary" style={{ fontSize: 13 }}>
                EIA-310 19-inch cabinet elevation · {totalHeight} rack units (U01–U
                {String(totalHeight).padStart(2, '0')})
              </Text>
            </Flex>

            <Flex align="center" gap={8} wrap>
              {/* Prominent + Mount Equipment Button */}
              <Tooltip
                title={
                  availableUnits <= 0 ? 'Cabinet is fully occupied (0 U available)' : undefined
                }
              >
                <span>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={availableUnits <= 0}
                    onClick={handleMountEquipment}
                    aria-label="Mount equipment into rack"
                    data-testid="mount-equipment-btn"
                  >
                    + Mount Equipment
                  </Button>
                </span>
              </Tooltip>

              {/* Inline Quick-Stepper (+ / - Slot Capacity Controls) */}
              <Space.Compact size="middle">
                <Tooltip
                  title={
                    canDecrement
                      ? 'Decrease rack capacity ( -1U )'
                      : `Cannot decrease below U${minCapacity} (occupied by mounted devices)`
                  }
                >
                  <Button
                    icon={<MinusOutlined />}
                    disabled={!canDecrement || updatingCapacity}
                    onClick={() => handleUpdateCapacity(capacity - 1)}
                    aria-label="Decrease rack capacity"
                    data-testid="rack-decrement-slot-btn"
                  />
                </Tooltip>
                <InputNumber
                  min={minCapacity}
                  max={100}
                  step={1}
                  precision={0}
                  value={inputCapacity}
                  disabled={updatingCapacity}
                  formatter={(val) => (val !== undefined && val !== null ? `${val} RU` : '')}
                  parser={(val) => {
                    const match = val?.match(/[0-9]+(?:\.[0-9]+)?/)?.[0];
                    return match ? Math.round(Number(match)) : (0 as unknown as number);
                  }}
                  onChange={(val) => {
                    setInputCapacity(val);
                  }}
                  onPressEnter={(e) => {
                    const rawVal = (e.target as HTMLInputElement)?.value ?? '';
                    const match = rawVal.match(/[0-9]+(?:\.[0-9]+)?/)?.[0];
                    const parsed = match ? Math.round(Number(match)) : NaN;
                    const valToCommit =
                      !Number.isNaN(parsed) && parsed > 0 ? parsed : inputCapacity;
                    if (valToCommit !== null && valToCommit !== capacity) {
                      handleUpdateCapacity(valToCommit);
                    } else {
                      setInputCapacity(capacity);
                    }
                  }}
                  onBlur={(e) => {
                    const rawVal = (e.target as HTMLInputElement)?.value ?? '';
                    const match = rawVal.match(/[0-9]+(?:\.[0-9]+)?/)?.[0];
                    const parsed = match ? Math.round(Number(match)) : NaN;
                    const valToCommit =
                      !Number.isNaN(parsed) && parsed > 0 ? parsed : inputCapacity;
                    if (valToCommit !== null && valToCommit !== capacity) {
                      handleUpdateCapacity(valToCommit);
                    } else {
                      setInputCapacity(capacity);
                    }
                  }}
                  onStep={(val) => {
                    if (val !== null && val !== undefined) {
                      handleUpdateCapacity(val);
                    }
                  }}
                  style={{ width: 95 }}
                  aria-label="Rack capacity in RU"
                  data-testid="rack-capacity-input"
                />
                <Tooltip title="Increase rack capacity ( +1U )">
                  <Button
                    icon={<PlusOutlined />}
                    disabled={capacity >= 100 || updatingCapacity}
                    onClick={() => handleUpdateCapacity(capacity + 1)}
                    aria-label="Increase rack capacity"
                    data-testid="rack-increment-slot-btn"
                  />
                </Tooltip>
              </Space.Compact>

              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'front' | 'rear')}
                options={[
                  {
                    label: 'Front View',
                    value: 'front',
                    icon: <EyeOutlined />,
                  },
                  {
                    label: 'Rear View',
                    value: 'rear',
                    icon: <SwapOutlined />,
                  },
                ]}
              />

              <Segmented
                value={sttOrder}
                onChange={(val) => setSttOrder(val as 'asc' | 'desc')}
                options={[
                  {
                    label: 'STT 1→N',
                    value: 'asc',
                    icon: <SortAscendingOutlined />,
                  },
                  {
                    label: 'STT N→1',
                    value: 'desc',
                    icon: <SortDescendingOutlined />,
                  },
                ]}
                data-testid="stt-order-segmented"
              />
              {extraActions}
            </Flex>
          </Flex>

          {/* Telemetry Space Utilization Row */}
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <Flex vertical gap={4} style={{ width: '100%' }}>
              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                  Space Utilization
                </Text>
                <Text
                  strong
                  style={{
                    fontSize: 13,
                    color: occupiedUnitsCount > totalHeight ? token.colorError : undefined,
                  }}
                >
                  {occupiedUnitsCount} / {totalHeight} U ({spaceUtilPercent}%)
                </Text>
              </Flex>
              <Progress
                percent={Math.min(100, Math.max(0, spaceUtilPercent))}
                size="small"
                strokeColor={
                  spaceUtilPercent > 90
                    ? token.colorError
                    : spaceUtilPercent > 75
                      ? token.colorWarning
                      : token.colorSuccess
                }
                showInfo={false}
              />
              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {availableUnits} U Available
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {devices.length} mounted {devices.length === 1 ? 'device' : 'devices'}
                </Text>
              </Flex>
            </Flex>
          </Card>

          {/* 2D Visual Cabinet Frame (Compact Elevation: Only Mounted Equipment) */}
          <Flex justify="center" style={{ width: '100%', padding: '8px 0' }}>
            <div
              data-testid="rack-cabinet-frame"
              style={{
                width: 520,
                backgroundColor: token.colorBgContainer,
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowSecondary,
                border: `2px solid ${token.colorBorder}`,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Cabinet Top Hood */}
              <div
                style={{
                  height: 36,
                  backgroundColor: token.colorFillAlter,
                  borderBottom: `2px solid ${token.colorBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                }}
              >
                <Flex align="center" gap={8}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: token.colorSuccess,
                      boxShadow: `0 0 6px ${token.colorSuccess}`,
                    }}
                  />
                  <Text
                    style={{
                      color: token.colorText,
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 1,
                    }}
                  >
                    {rack.code || 'EIA-310'} · {viewMode.toUpperCase()}
                  </Text>
                </Flex>
                <Text
                  style={{
                    color: token.colorTextSecondary,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                >
                  {totalHeight}U CABINET
                </Text>
              </div>

              {/* Compact Equipment Mounting Area (Omit all empty slot rows) */}
              {sortedDevices.length === 0 ? (
                <div
                  data-testid="rack-empty-mount-state"
                  style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    backgroundColor: token.colorBgLayout,
                  }}
                >
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <Flex vertical align="center" gap={2}>
                        <Text strong style={{ fontSize: 13 }}>
                          No Equipment Mounted
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Cabinet is unoccupied. Click below to install your first device.
                        </Text>
                      </Flex>
                    }
                  >
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleMountEquipment}
                      data-testid="mount-first-equipment-btn"
                    >
                      + Mount Equipment
                    </Button>
                  </Empty>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: token.colorBgLayout,
                  }}
                >
                  {positionedDevices.map(
                    ({
                      device,
                      sttNumber,
                      sttLabel,
                      devHeightU,
                      startU,
                      endU,
                      spannedUnits,
                      pixelHeight,
                    }) => {
                      return (
                        <div
                          key={`mounted-row-${device.id}`}
                          data-testid={`rack-device-row-${device.id}`}
                          data-stt={sttNumber}
                          style={{
                            display: 'flex',
                            position: 'relative',
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        >
                          {/* Left EIA-310 Rail */}
                          <div
                            style={{
                              width: 44,
                              backgroundColor: token.colorFillAlter,
                              borderRight: `1px solid ${token.colorBorderSecondary}`,
                              display: 'flex',
                              flexDirection: 'column',
                              userSelect: 'none',
                            }}
                          >
                            {spannedUnits.map((u) => (
                              <div
                                key={`left-rail-${device.id}-${u}`}
                                data-testid={`left-rail-u-${u}`}
                                data-stt={sttNumber}
                                style={{
                                  height: UNIT_HEIGHT_PX,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0 4px',
                                  borderBottom:
                                    u > startU ? `1px solid ${token.colorBorderSecondary}` : 'none',
                                  color:
                                    hoveredUnit === u || hoveredDeviceId === device.id
                                      ? token.colorPrimary
                                      : token.colorTextTertiary,
                                  fontSize: 10,
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                }}
                              >
                                <span style={{ fontSize: 9 }}>{sttLabel}</span>
                                <span style={{ fontSize: 7, opacity: 0.6, letterSpacing: -1 }}>
                                  ●●●
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Central Equipment Chassis */}
                          <Tooltip
                            key={`device-slot-${device.id}`}
                            title={
                              <Flex
                                vertical
                                gap={4}
                                style={{ padding: 4, color: token.colorTextLightSolid }}
                              >
                                <Text strong style={{ color: token.colorTextLightSolid }}>
                                  {device.name}
                                </Text>
                                <span style={{ fontSize: 12, opacity: 0.85 }}>
                                  Vendor: {device.vendor} | Model: {device.model}
                                </span>
                                <span style={{ fontSize: 11, opacity: 0.75 }}>
                                  STT: {sttLabel} ({devHeightU}U · Slot U
                                  {String(startU).padStart(2, '0')}
                                  {devHeightU > 1 ? `–U${String(endU).padStart(2, '0')}` : ''})
                                </span>
                                <span style={{ fontSize: 11, opacity: 0.75 }}>
                                  Role: {device.role} | Status: {device.status}
                                </span>
                                {device.totalPorts && (
                                  <span
                                    style={{
                                      color: token.colorPrimaryActive,
                                      fontSize: 11,
                                      fontWeight: 500,
                                    }}
                                  >
                                    Ports: {device.activePortsCount ?? 0} active /{' '}
                                    {device.totalPorts} total
                                  </span>
                                )}
                                <span style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
                                  Click to view device specifications & port matrix
                                </span>
                              </Flex>
                            }
                          >
                            <div
                              data-testid={`mounted-device-${device.id}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`Mounted switch ${device.name} at STT ${sttLabel}`}
                              onClick={() => handleDeviceClick(device)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleDeviceClick(device);
                                }
                              }}
                              onMouseEnter={() => {
                                setHoveredUnit(startU);
                                setHoveredDeviceId(device.id);
                              }}
                              onMouseLeave={() => {
                                setHoveredUnit(null);
                                setHoveredDeviceId(null);
                              }}
                              style={{
                                flex: 1,
                                height: pixelHeight,
                                backgroundColor:
                                  viewMode === 'front'
                                    ? token.colorBgElevated
                                    : token.colorFillSecondary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0 12px',
                                boxSizing: 'border-box',
                                transition: 'all 0.15s ease',
                                position: 'relative',
                                gap: 8,
                              }}
                            >
                              {/* Device Left Section: Bezel Screws, Status, STT Tag, Vendor Tag, Name */}
                              <Flex align="center" gap={8} style={{ overflow: 'hidden', flex: 1 }}>
                                <div
                                  style={{
                                    width: 6,
                                    height: Math.min(16, pixelHeight - 6),
                                    borderRadius: token.borderRadiusSM,
                                    backgroundColor: token.colorTextQuaternary,
                                  }}
                                />
                                {getStatusIndicator(device.status)}
                                <Tag
                                  color="blue"
                                  style={{
                                    fontSize: 10,
                                    lineHeight: '16px',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    padding: '0 4px',
                                    margin: 0,
                                  }}
                                >
                                  {sttLabel}
                                </Tag>
                                <Tag
                                  color={getRoleTagColor(device.role)}
                                  style={{
                                    fontSize: 10,
                                    lineHeight: '16px',
                                    padding: '0 4px',
                                    margin: 0,
                                  }}
                                >
                                  {device.vendor || 'DEV'}
                                </Tag>
                                <Text
                                  strong
                                  ellipsis
                                  style={{
                                    color: token.colorText,
                                    fontSize: 12,
                                    maxWidth: 140,
                                  }}
                                >
                                  {device.name}
                                </Text>
                              </Flex>

                              {/* Device Middle Section: Front/Rear Details */}
                              {viewMode === 'front' ? (
                                <Flex align="center" gap={6}>
                                  <Text
                                    ellipsis
                                    style={{
                                      color: token.colorTextSecondary,
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                      maxWidth: 120,
                                    }}
                                  >
                                    {device.model}
                                  </Text>
                                  <Tag
                                    color={device.status === 'ONLINE' ? 'success' : 'default'}
                                    style={{ fontSize: 9, margin: 0 }}
                                  >
                                    {devHeightU}U
                                  </Tag>
                                </Flex>
                              ) : (
                                /* Rear View Details: PSUs and Fans */
                                <Flex align="center" gap={6}>
                                  <Tag color="gold" style={{ fontSize: 9, margin: 0 }}>
                                    PSU 1 [AC]
                                  </Tag>
                                  <Tag color="gold" style={{ fontSize: 9, margin: 0 }}>
                                    PSU 2 [AC]
                                  </Tag>
                                  <Tag color="blue" style={{ fontSize: 9, margin: 0 }}>
                                    FAN
                                  </Tag>
                                </Flex>
                              )}

                              {/* Device Right Section: Unmount Control */}
                              <Flex
                                align="center"
                                gap={4}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <Tooltip title="Unmount device from rack">
                                  <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                    disabled={busyDeviceIds.has(device.id)}
                                    onClick={(e) => handleUnmountDevice(device, e)}
                                    aria-label={`Unmount ${device.name}`}
                                    data-testid={`unmount-device-${device.id}`}
                                    style={{ width: 22, height: 22, padding: 0 }}
                                  />
                                </Tooltip>
                              </Flex>
                            </div>
                          </Tooltip>

                          {/* Right EIA-310 Rail */}
                          <div
                            style={{
                              width: 44,
                              backgroundColor: token.colorFillAlter,
                              borderLeft: `1px solid ${token.colorBorderSecondary}`,
                              display: 'flex',
                              flexDirection: 'column',
                              userSelect: 'none',
                            }}
                          >
                            {spannedUnits.map((u) => (
                              <div
                                key={`right-rail-${device.id}-${u}`}
                                data-testid={`right-rail-u-${u}`}
                                data-stt={sttNumber}
                                style={{
                                  height: UNIT_HEIGHT_PX,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0 4px',
                                  borderBottom:
                                    u > startU ? `1px solid ${token.colorBorderSecondary}` : 'none',
                                  color:
                                    hoveredUnit === u || hoveredDeviceId === device.id
                                      ? token.colorPrimary
                                      : token.colorTextTertiary,
                                  fontSize: 10,
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                }}
                              >
                                <span style={{ fontSize: 7, opacity: 0.6, letterSpacing: -1 }}>
                                  ●●●
                                </span>
                                <span style={{ fontSize: 9 }}>{sttLabel}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              {/* Cabinet Bottom Base & Feet */}
              <div
                style={{
                  height: 24,
                  backgroundColor: token.colorFillAlter,
                  borderTop: `2px solid ${token.colorBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  padding: '0 32px',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 8,
                    backgroundColor: token.colorFillSecondary,
                    borderRadius: 2,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                />
                <Text
                  style={{
                    color: token.colorTextTertiary,
                    fontSize: 10,
                    letterSpacing: 1,
                  }}
                >
                  LEVELING BASE · EIA-310-D
                </Text>
                <div
                  style={{
                    width: 40,
                    height: 8,
                    backgroundColor: token.colorFillSecondary,
                    borderRadius: 2,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                />
              </div>
            </div>
          </Flex>
        </Flex>
      </Spin>
    );
  },
);

RackElevationView.displayName = 'RackElevationView';
