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
}

export const LicenseTable: React.FC<LicenseTableProps> = React.memo(
  ({ licenses, loading, onOpenSeatsDrawer, onOpenEditModal, onDeleteLicense }) => {
    const columns = useMemo(
      () => [
        {
          title: 'Software & Vendor',
          dataIndex: 'name',
          key: 'name',
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
            </div>
          ),
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          sorter: (a: License, b: License) => a.status.localeCompare(b.status),
          render: (status: string) => (
            <Tag
              color={
                status === 'Active' ? 'success' : status === 'Expiring' ? 'warning' : 'default'
              }
            >
              {status}
            </Tag>
          ),
        },
        {
          title: 'Seat Utilization',
          key: 'seats',
          width: 200,
          sorter: (a: License, b: License) => a.totalSeats - b.totalSeats,
          render: (_: unknown, record: License) => {
            const percent =
              record.totalSeats > 0 ? Math.round((record.usedSeats / record.totalSeats) * 100) : 0;
            let strokeColor = '#10b981';
            if (percent >= 90) strokeColor = '#ef4444';
            else if (percent > 75) strokeColor = '#f59e0b';

            const remaining = Math.max(0, record.totalSeats - record.usedSeats);

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
                  <Text type="secondary">{percent}%</Text>
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
          title: 'Expiration Date',
          dataIndex: 'expiryDate',
          key: 'expiryDate',
          sorter: (a: License, b: License) =>
            (a.expiryDate || '').localeCompare(b.expiryDate || ''),
          render: (expiryDate: string, record: License) => {
            const diff = expiryDate ? dayjs(expiryDate).diff(dayjs(), 'day') : 999;
            return (
              <div>
                <FormattedDate date={expiryDate} style={{ fontSize: 12.5 }} />
                <div style={{ marginTop: 2 }}>
                  {diff < 30 ? (
                    <Tag color="error" style={{ fontSize: 10 }}>
                      Expires in {diff}d
                    </Tag>
                  ) : record.autoRenew ? (
                    <Tag color="success" style={{ fontSize: 10 }}>
                      Auto-Renew
                    </Tag>
                  ) : (
                    <Tag color="default" style={{ fontSize: 10 }}>
                      Manual
                    </Tag>
                  )}
                </div>
              </div>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
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
        columns={columns}
        dataSource={licenses}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
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
