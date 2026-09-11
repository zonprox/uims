import {
  ApartmentOutlined,
  BankOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  LaptopOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { DirectoryUser } from '@uims/shared-types';
import {
  Avatar,
  Button,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React from 'react';

const { Text } = Typography;

export interface EmployeeTableProps {
  employees: DirectoryUser[];
  loading: boolean;
  onViewDetails: (emp: DirectoryUser) => void;
  onEdit: (emp: DirectoryUser) => void;
  onDelete: (emp: DirectoryUser) => void;
  copyToClipboard: (text: string, label: string) => void;
  getStatusTag: (status: string) => React.ReactNode;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = React.memo(
  ({ employees, loading, onViewDetails, onEdit, onDelete, copyToClipboard, getStatusTag }) => {
    const { token } = theme.useToken();

    const columns = [
      {
        title: 'Employee',
        key: 'employee',
        sorter: (a: DirectoryUser, b: DirectoryUser) =>
          (a.displayName || a.fullName || a.firstName || '').localeCompare(
            b.displayName || b.fullName || b.firstName || '',
          ) || (a.employeeCode || '').localeCompare(b.employeeCode || ''),
        render: (_: unknown, record: DirectoryUser) => (
          <Flex align="center" gap={10}>
            <Avatar
              style={{
                backgroundColor:
                  record.status === 'DISABLED' || record.status === 'SUSPENDED'
                    ? '#94a3b8'
                    : '#1677ff',
                flexShrink: 0,
              }}
              icon={<UserOutlined />}
            >
              {(record.firstName || record.fullName || 'E')[0]?.toUpperCase()}
            </Avatar>
            <Flex vertical style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, lineHeight: '18px' }}>
                {record.fullName || `${record.firstName} ${record.lastName}`.trim()}
              </Text>
              {record.employeeCode && (
                <Text type="secondary" style={{ fontSize: 11.5 }}>
                  #{record.employeeCode}
                </Text>
              )}
            </Flex>
          </Flex>
        ),
      },
      {
        title: 'Email & Contact',
        key: 'contact',
        render: (_: unknown, record: DirectoryUser) => (
          <Flex vertical gap={2}>
            <Flex align="center" gap={6}>
              <Text style={{ fontSize: 12 }}>{record.email}</Text>
              <Tooltip title="Copy email address">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />}
                  onClick={() => copyToClipboard(record.email, 'Email')}
                />
              </Tooltip>
            </Flex>
            {record.phone && (
              <Flex align="center" gap={4}>
                <PhoneOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.phone}
                </Text>
              </Flex>
            )}
          </Flex>
        ),
      },
      {
        title: 'Position & Facility',
        key: 'position',
        sorter: (a: DirectoryUser, b: DirectoryUser) =>
          (a.position?.title || '').localeCompare(b.position?.title || ''),
        render: (_: unknown, record: DirectoryUser) => (
          <Flex vertical gap={4}>
            <Text strong style={{ fontSize: 12.5 }}>
              {record.position?.title || 'Unassigned'}
            </Text>
            <Flex gap={4} wrap="wrap">
              {record.organization ? (
                <Tag color="purple" icon={<BankOutlined />} style={{ margin: 0, fontSize: 10.5 }}>
                  {record.organization.name}
                </Tag>
              ) : null}
              {record.location ? (
                <Tag
                  color="green"
                  icon={<EnvironmentOutlined />}
                  style={{ margin: 0, fontSize: 10.5 }}
                >
                  {record.location.name}
                </Tag>
              ) : null}
            </Flex>
          </Flex>
        ),
      },
      {
        title: 'Department',
        key: 'department',
        sorter: (a: DirectoryUser, b: DirectoryUser) =>
          (a.department?.name || '').localeCompare(b.department?.name || ''),
        render: (_: unknown, record: DirectoryUser) => (
          <div>
            {record.department ? (
              <Tag color="blue" icon={<ApartmentOutlined />} style={{ fontSize: 11 }}>
                {record.department.name}
              </Tag>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                General
              </Text>
            )}
          </div>
        ),
      },
      {
        title: 'Assigned Custody',
        key: 'custody',
        render: (_: unknown, record: DirectoryUser) => (
          <Flex gap={4} align="center">
            <Tag color="blue" icon={<LaptopOutlined />}>
              {record.assignedAssetsCount ?? 0} Assets
            </Tag>
            <Tag color="purple" icon={<SafetyCertificateOutlined />}>
              {record.assignedLicensesCount ?? 0} Licenses
            </Tag>
          </Flex>
        ),
      },
      {
        title: 'Status',
        key: 'status',
        sorter: (a: DirectoryUser, b: DirectoryUser) => a.status.localeCompare(b.status),
        render: (_: unknown, record: DirectoryUser) => getStatusTag(record.status),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, record: DirectoryUser) => (
          <Space size={2}>
            <Tooltip title="View Profile & Custody">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewDetails(record)}
              />
            </Tooltip>
            <Tooltip title="Edit Employee">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
            <Tooltip title="Delete Record">
              <Popconfirm
                title="Delete Directory Record"
                description={`Permanently remove employee ${record.fullName || record.email} from directory?`}
                onConfirm={() => onDelete(record)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={employees}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total) => `Total ${total} employees`,
        }}
      />
    );
  },
);

EmployeeTable.displayName = 'EmployeeTable';
