import { EditOutlined, TeamOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Button, Flex, Popconfirm, Progress, Space, Table, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { FormattedDate } from '../../../components/FormattedDate';
import type { License } from '../../../services/licenses.service';

const { Text } = Typography;

export interface LicenseTableProps {
  licenses: Array<License>;
  loading: boolean;
  onOpenSeatsDrawer: (license: License) => void;
  onOpenEditModal: (license: License) => void;
  onDeleteLicense: (id: string) => void;
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[], rows?: License[]) => void;
}

export const LicenseTable: React.FC<LicenseTableProps> = React.memo(
  ({
    licenses,
    loading,
    onOpenSeatsDrawer,
    onOpenEditModal,
    onDeleteLicense,
    selectedRowKeys,
    onSelectionChange,
  }) => {
    const columns = useMemo(
      () => [
        {
          title: 'Software & Vendor',
          dataIndex: 'name',
          key: 'name',
          width: '28%',
          sorter: (a: License, b: License) =>
            a.name.localeCompare(b.name) || (a.licenseKey || '').localeCompare(b.licenseKey || ''),
          render: (name: string, record: License) => (
            <div>
              <Text
                strong
                style={{ fontSize: 13, cursor: 'pointer', color: '#1677ff' }}
                onClick={() => onOpenSeatsDrawer(record)}
              >
                {name}
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>
                {record.vendor} • {record.type}
              </Text>
              {record.licenseKey && record.licenseKey !== 'N/A' && (
                <Text
                  code
                  copyable={{ text: record.licenseKey }}
                  style={{ fontSize: 10.5, marginTop: 2, display: 'inline-block' }}
                >
                  {record.licenseKey}
                </Text>
              )}
            </div>
          ),
        },
        {
          title: 'Seat Utilization',
          key: 'seats',
          width: '22%',
          sorter: (a: License, b: License) => a.totalSeats - b.totalSeats,
          render: (_: unknown, record: License) => {
            const percent =
              record.totalSeats > 0 ? Math.round((record.usedSeats / record.totalSeats) * 100) : 0;
            let strokeColor = '#10b981';
            if (percent >= 90) strokeColor = '#ef4444';
            else if (percent > 75) strokeColor = '#f59e0b';

            const remaining = Math.max(0, record.totalSeats - record.usedSeats);
            const isExhausted = remaining <= 0;

            return (
              <div>
                <Flex
                  justify="space-between"
                  align="center"
                  style={{ fontSize: 11.5, marginBottom: 2 }}
                >
                  <Text strong>
                    {record.usedSeats} / {record.totalSeats} seats
                  </Text>
                  <Space size={4}>
                    {isExhausted && (
                      <Tag
                        color="error"
                        style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}
                      >
                        Capacity Reached
                      </Tag>
                    )}
                    <Text type="secondary">{percent}%</Text>
                  </Space>
                </Flex>
                <Progress
                  percent={percent}
                  strokeColor={strokeColor}
                  size="small"
                  showInfo={false}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {remaining} seats free
                </Text>
              </div>
            );
          },
        },
        {
          title: 'Annual Spend',
          key: 'cost',
          width: '18%',
          sorter: (a: License, b: License) =>
            (a.usedSeats || 0) * (a.costPerSeat || 0) - (b.usedSeats || 0) * (b.costPerSeat || 0),
          render: (_: unknown, record: License) => (
            <div>
              <Text strong style={{ fontSize: 13 }}>
                ${((record.usedSeats || 0) * (record.costPerSeat || 0)).toLocaleString()}/yr
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                ${record.costPerSeat || 0}/seat
              </Text>
            </div>
          ),
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          width: '18%',
          sorter: (a: License, b: License) =>
            a.status.localeCompare(b.status) ||
            (a.expiryDate || '').localeCompare(b.expiryDate || ''),
          render: (status: string, record: License) => {
            const diff = record.expiryDate ? dayjs(record.expiryDate).diff(dayjs(), 'day') : 999;
            return (
              <Flex vertical gap={2}>
                <Flex align="center" gap={4} wrap="wrap">
                  <Tag
                    color={
                      status === 'Active'
                        ? 'success'
                        : status === 'Expiring'
                          ? 'warning'
                          : 'default'
                    }
                    style={{ margin: 0 }}
                  >
                    {status}
                  </Tag>
                  {diff < 30 ? (
                    <Tag
                      color="error"
                      style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}
                    >
                      Expires in {diff}d
                    </Tag>
                  ) : record.autoRenew ? (
                    <Tag
                      color="success"
                      style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}
                    >
                      Auto-Renew
                    </Tag>
                  ) : null}
                </Flex>
                {record.expiryDate && (
                  <FormattedDate date={record.expiryDate} style={{ fontSize: 11.5 }} />
                )}
              </Flex>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 150,
          render: (_: unknown, record: License) => (
            <Space size="small">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<TeamOutlined />}
                onClick={() => onOpenSeatsDrawer(record)}
              >
                Seats
              </Button>
              <Tooltip title="Edit License">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete license?"
                description="This action cannot be undone."
                onConfirm={() => onDeleteLicense(record.id)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    danger
                    icon={<UserDeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          ),
        },
      ],
      [onOpenSeatsDrawer, onOpenEditModal, onDeleteLicense],
    );

    return (
      <Table
        size="middle"
        columns={columns}
        dataSource={licenses}
        rowKey="id"
        loading={loading}
        rowSelection={
          onSelectionChange
            ? {
                selectedRowKeys,
                onChange: onSelectionChange,
              }
            : undefined
        }
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total) => `Total ${total} licenses`,
        }}
      />
    );
  },
);

LicenseTable.displayName = 'LicenseTable';
