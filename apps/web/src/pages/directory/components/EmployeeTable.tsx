import {
  ApartmentOutlined,
  BankOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  LaptopOutlined,
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

    // Streamlined 5-Column High-Signal Layout (Fluid, Scroll-Free)
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
              <Flex align="center" gap={6}>
                <Text strong style={{ fontSize: 13, lineHeight: '18px' }}>
                  {record.fullName || `${record.firstName} ${record.lastName}`.trim()}
                </Text>
                {record.domainJoined && (
                  <Tag
                    color="geekblue"
                    style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
                  >
                    AD
                  </Tag>
                )}
              </Flex>
              <Flex align="center" gap={6} wrap="wrap">
                {record.employeeCode && (
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    #{record.employeeCode}
                  </Text>
                )}
                {record.email && (
                  <Flex align="center" gap={3}>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      · {record.email}
                    </Text>
                    {record.hasEmailPassword && (
                      <Tooltip title="Enterprise Email Password Configured">
                        <KeyOutlined style={{ fontSize: 10.5, color: token.colorPrimary }} />
                      </Tooltip>
                    )}
                    <Tooltip title="Copy email address">
                      <Button
                        type="text"
                        size="small"
                        icon={
                          <CopyOutlined
                            style={{ fontSize: 10.5, color: token.colorTextTertiary }}
                          />
                        }
                        onClick={() => copyToClipboard(record.email, 'Email')}
                        style={{ padding: '0 2px', height: 16 }}
                      />
                    </Tooltip>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Flex>
        ),
      },
      {
        title: 'Position & Department',
        key: 'position',
        sorter: (a: DirectoryUser, b: DirectoryUser) =>
          (a.position?.title || '').localeCompare(b.position?.title || ''),
        render: (_: unknown, record: DirectoryUser) => (
          <Flex vertical gap={3}>
            <Text strong style={{ fontSize: 12.5 }}>
              {record.position?.title || 'Unassigned'}
            </Text>
            <Flex gap={4} wrap="wrap">
              {record.department ? (
                <Tag
                  color="blue"
                  icon={<ApartmentOutlined />}
                  style={{ margin: 0, fontSize: 10.5 }}
                >
                  {record.department.name}
                </Tag>
              ) : (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  General
                </Text>
              )}
              {record.organization && (
                <Tag color="purple" icon={<BankOutlined />} style={{ margin: 0, fontSize: 10.5 }}>
                  {record.organization.name}
                </Tag>
              )}
            </Flex>
          </Flex>
        ),
      },
      {
        title: 'Custody',
        key: 'custody',
        render: (_: unknown, record: DirectoryUser) => (
          <Flex gap={4} align="center" wrap="wrap">
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
        width: 110,
        sorter: (a: DirectoryUser, b: DirectoryUser) => a.status.localeCompare(b.status),
        render: (_: unknown, record: DirectoryUser) => getStatusTag(record.status),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
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
