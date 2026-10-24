import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { DoorSecurityLevel, DoorStatus, type DoorWithCountDto } from '@uims/shared-types';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useState } from 'react';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { DoorFilterState } from '../types/access-control.types';
import {
  formatDate,
  getDoorStatusColor,
  getSecurityLevelColor,
} from '../utils/access-control.utils';

interface DoorsTabProps {
  onOpenDoorDrawer: (doorId: string) => void;
  onEditDoor: (door: DoorWithCountDto) => void;
  onAddDoor: () => void;
  onGrantDoor: (doorId: string) => void;
  refreshTrigger: number;
}

export const DoorsTab: React.FC<DoorsTabProps> = ({
  onOpenDoorDrawer,
  onEditDoor,
  onAddDoor,
  onGrantDoor,
  refreshTrigger,
}) => {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [doors, setDoors] = useState<DoorWithCountDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState<DoorFilterState>({
    search: '',
    status: 'ALL',
    securityLevel: 'ALL',
    building: undefined,
  });

  const loadDoors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accessControlService.getDoors({
        page,
        pageSize,
        search: filters.search.trim() || undefined,
        status: filters.status !== 'ALL' ? filters.status : undefined,
        securityLevel: filters.securityLevel !== 'ALL' ? filters.securityLevel : undefined,
        building: filters.building || undefined,
      });
      setDoors(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load physical doors inventory'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, message]);

  useEffect(() => {
    loadDoors();
  }, [loadDoors, refreshTrigger]);

  const columns: ColumnsType<DoorWithCountDto> = [
    {
      title: 'Door Code',
      dataIndex: 'doorCode',
      key: 'doorCode',
      width: 140,
      render: (code: string, record) => (
        <Tag
          color="cyan"
          style={{
            fontFamily: 'monospace',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => onOpenDoorDrawer(record.id)}
        >
          {code}
        </Tag>
      ),
    },
    {
      title: 'Door Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <a
          style={{ fontWeight: 600, color: '#0f172a' }}
          onClick={() => onOpenDoorDrawer(record.id)}
        >
          {name}
        </a>
      ),
    },
    {
      title: 'Facility Location',
      key: 'location',
      render: (_, record) => (
        <Space vertical size={1} style={{ fontSize: 13 }}>
          <span>
            {record.building} • Floor {record.floor}
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {record.zone || record.location || 'General Zone'}
          </span>
        </Space>
      ),
    },
    {
      title: 'Security Level',
      dataIndex: 'securityLevel',
      key: 'securityLevel',
      width: 130,
      render: (level: DoorSecurityLevel) => <Tag color={getSecurityLevelColor(level)}>{level}</Tag>,
    },
    {
      title: 'Controller / Reader',
      key: 'hardware',
      render: (_, record) => (
        <Space vertical size={1} style={{ fontSize: 12 }}>
          <span>{record.controllerModel || 'Standard Controller'}</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Reader: {record.readerId || record.readerType || 'RFID'}
          </span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: DoorStatus) => <Tag color={getDoorStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Active Users',
      dataIndex: 'activeUsersCount',
      key: 'activeUsersCount',
      width: 120,
      align: 'center',
      render: (count: number, record) => (
        <Tooltip title="View authorized personnel list">
          <Badge
            count={count}
            showZero
            style={{
              backgroundColor: count > 0 ? '#10b981' : '#94a3b8',
              cursor: 'pointer',
            }}
            onClick={() => onOpenDoorDrawer(record.id)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 110,
      render: (val: string) => formatDate(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View door details & access list">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onOpenDoorDrawer(record.id)}
            />
          </Tooltip>
          <Tooltip title="Grant access to this door">
            <Button
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => onGrantDoor(record.id)}
            />
          </Tooltip>
          <Tooltip title="Edit door configuration">
            <Button size="small" icon={<EditOutlined />} onClick={() => onEditDoor(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: 16 } }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} md={8}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search door code, name, zone, location..."
            allowClear
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
          />
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            value={filters.status}
            onChange={(val) => {
              setFilters((prev) => ({ ...prev, status: val }));
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: DoorStatus.ACTIVE, label: 'Active' },
              { value: DoorStatus.MAINTENANCE, label: 'Maintenance' },
              { value: DoorStatus.INACTIVE, label: 'Inactive' },
            ]}
          />
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            value={filters.securityLevel}
            onChange={(val) => {
              setFilters((prev) => ({ ...prev, securityLevel: val }));
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Security Levels' },
              { value: DoorSecurityLevel.STANDARD, label: 'Standard' },
              { value: DoorSecurityLevel.RESTRICTED, label: 'Restricted' },
              { value: DoorSecurityLevel.HIGH, label: 'High Security' },
              { value: DoorSecurityLevel.CRITICAL, label: 'Critical' },
            ]}
          />
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Flex justify="flex-end" gap={8}>
            <Button icon={<ReloadOutlined />} onClick={loadDoors}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAddDoor}>
              Add Door
            </Button>
          </Flex>
        </Col>
      </Row>

      <Table
        dataSource={doors}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50'],
          showTotal: (totalCount) => `Total ${totalCount} doors`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </Card>
  );
};
