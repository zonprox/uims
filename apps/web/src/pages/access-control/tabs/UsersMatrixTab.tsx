import {
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  AccessSubjectType,
  type NonADUserWithCountDto,
  type UnifiedUserRowDto,
} from '@uims/shared-types';
import {
  App,
  Avatar,
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
import type { UserFilterState } from '../types/access-control.types';
import { getSubjectTypeTag } from '../utils/access-control.utils';

interface UsersMatrixTabProps {
  onOpenUserDrawer: (subjectType: string, subjectId: string) => void;
  onQuickGrant: (subjectType: string, subjectId: string) => void;
  onAddNonAdUser: () => void;
  onEditNonAdUser: (user: NonADUserWithCountDto) => void;
  refreshTrigger: number;
}

export const UsersMatrixTab: React.FC<UsersMatrixTabProps> = ({
  onOpenUserDrawer,
  onQuickGrant,
  onAddNonAdUser,
  onEditNonAdUser,
  refreshTrigger,
}) => {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UnifiedUserRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    subjectType: 'ALL',
    status: 'ALL',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accessControlService.getUnifiedUsers({
        page,
        pageSize,
        search: filters.search.trim() || undefined,
        subjectType: filters.subjectType !== 'ALL' ? filters.subjectType : undefined,
        status: filters.status !== 'ALL' ? filters.status : undefined,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load user access matrix'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, message]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, refreshTrigger]);

  const handleEditClick = async (nonAdUserId: string) => {
    try {
      const detail = await accessControlService.getNonADUserById(nonAdUserId);
      onEditNonAdUser(detail);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'fetch external user details'));
    }
  };

  const columns: ColumnsType<UnifiedUserRowDto> = [
    {
      title: 'Individual & Identification',
      key: 'subject',
      render: (_, record) => {
        const tag = getSubjectTypeTag(record.subjectType);
        const initials = record.fullName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        return (
          <Space align="center" size={10}>
            <Avatar
              style={{
                backgroundColor:
                  record.subjectType === AccessSubjectType.DIRECTORY_USER ? '#1677ff' : '#8b5cf6',
              }}
            >
              {initials || <UserOutlined />}
            </Avatar>
            <Space vertical size={1}>
              <Space>
                <a
                  style={{ fontWeight: 600, color: '#0f172a' }}
                  onClick={() => onOpenUserDrawer(record.subjectType, record.id)}
                >
                  {record.fullName}
                </a>
                <Tag color={tag.color} style={{ fontSize: 11, lineHeight: '18px' }}>
                  {tag.label}
                </Tag>
              </Space>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                ID / Badge: {record.codeOrBadge}
              </span>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Organization / Company',
      key: 'organization',
      render: (_, record) => (
        <Space vertical size={1} style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 500 }}>{record.organizationOrCompany}</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {record.departmentOrTitle || 'N/A'}
          </span>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space vertical size={1} style={{ fontSize: 12 }}>
          <span>{record.email || '—'}</span>
          <span style={{ color: '#64748b' }}>{record.phone || '—'}</span>
        </Space>
      ),
    },
    {
      title: 'Accessible Doors',
      dataIndex: 'activeDoorsCount',
      key: 'activeDoorsCount',
      width: 140,
      align: 'center',
      render: (count: number, record) => (
        <Tooltip title="View authorized doors for this user">
          <Badge
            count={count}
            showZero
            style={{
              backgroundColor: count > 0 ? '#10b981' : '#94a3b8',
              cursor: 'pointer',
            }}
            onClick={() => onOpenUserDrawer(record.subjectType, record.id)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag
          color={status === 'ACTIVE' ? 'success' : status === 'BLACKLISTED' ? 'error' : 'default'}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View clearance details & history">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onOpenUserDrawer(record.subjectType, record.id)}
            />
          </Tooltip>
          <Tooltip title="Grant door access">
            <Button
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => onQuickGrant(record.subjectType, record.id)}
            />
          </Tooltip>
          {record.subjectType === AccessSubjectType.NON_AD_USER && (
            <Tooltip title="Edit external personnel profile">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditClick(record.id)}
              />
            </Tooltip>
          )}
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
            placeholder="Search name, badge #, email, company..."
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
            value={filters.subjectType}
            onChange={(val) => {
              setFilters((prev) => ({ ...prev, subjectType: val }));
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Subjects' },
              { value: AccessSubjectType.DIRECTORY_USER, label: 'AD Employees' },
              { value: AccessSubjectType.NON_AD_USER, label: 'External / Non-AD' },
            ]}
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
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Flex justify="flex-end" gap={8}>
            <Button icon={<ReloadOutlined />} onClick={loadUsers}>
              Refresh
            </Button>
            <Button type="primary" icon={<UserAddOutlined />} onClick={onAddNonAdUser}>
              Add External User
            </Button>
          </Flex>
        </Col>
      </Row>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50'],
          showTotal: (totalCount) => `Total ${totalCount} users`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </Card>
  );
};
