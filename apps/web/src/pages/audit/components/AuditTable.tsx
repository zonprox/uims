import { EyeOutlined } from '@ant-design/icons';
import { Avatar, Button, Flex, Table, Tag, Typography } from 'antd';
import React, { useMemo } from 'react';
import { FormattedDateTime } from '../../../components/FormattedDate';
import type { AuditLog } from '../../../services/audit.service';

const { Text } = Typography;

export interface AuditTableProps {
  logs: Array<AuditLog>;
  loading: boolean;
  onInspectLog: (log: AuditLog) => void;
  pagination?: object | false;
}

export const AuditTable: React.FC<AuditTableProps> = React.memo(
  ({ logs, loading, onInspectLog, pagination }) => {
    const columns = useMemo(
      () => [
        {
          title: 'Timestamp',
          dataIndex: 'timestamp',
          key: 'timestamp',
          width: '20%',
          sorter: (a: AuditLog, b: AuditLog) =>
            (a.timestamp || '').localeCompare(b.timestamp || '') || a.id.localeCompare(b.id),
          render: (ts: string, record: AuditLog) => (
            <div>
              <FormattedDateTime date={ts} showOffset monospace />
              <Text
                type="secondary"
                code
                style={{ display: 'block', fontSize: 10.5, marginTop: 2 }}
              >
                {record.id}
              </Text>
            </div>
          ),
        },
        {
          title: 'Actor',
          key: 'actor',
          width: '24%',
          sorter: (a: AuditLog, b: AuditLog) =>
            (a.userName || a.user || '').localeCompare(b.userName || b.user || '') ||
            (a.ipAddress || '').localeCompare(b.ipAddress || ''),
          render: (_: unknown, record: AuditLog) => {
            const actorName = record.userName || record.user || 'System Engine';
            return (
              <Flex align="center" gap={8}>
                <Avatar
                  size="small"
                  style={{ backgroundColor: '#1890ff', fontSize: 11, flexShrink: 0 }}
                >
                  {(actorName[0] || 'S').toUpperCase()}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                    {actorName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {record.userEmail || 'system@youngonevn.com'}
                  </Text>
                  {record.ipAddress && (
                    <Text code style={{ fontSize: 10.5, display: 'inline-block', marginTop: 2 }}>
                      {record.ipAddress}
                    </Text>
                  )}
                </div>
              </Flex>
            );
          },
        },
        {
          title: 'Action & Severity',
          dataIndex: 'action',
          key: 'action',
          width: '22%',
          sorter: (a: AuditLog, b: AuditLog) =>
            (a.action || '').localeCompare(b.action || '') ||
            (a.severity || '').localeCompare(b.severity || ''),
          render: (action: string, record: AuditLog) => {
            let actionColor = 'default';
            if (
              action?.includes('DELETE') ||
              action?.includes('REVOKE') ||
              action?.includes('FAILED')
            ) {
              actionColor = 'error';
            } else if (action?.includes('CREATE') || action?.includes('GRANT')) {
              actionColor = 'processing';
            } else if (action?.includes('UPDATE') || action?.includes('ROTATE')) {
              actionColor = 'warning';
            } else if (action === 'LOGIN_SUCCESS') {
              actionColor = 'success';
            }

            let sevColor = 'blue';
            if (record.severity === 'Critical') sevColor = 'error';
            else if (record.severity === 'Warning') sevColor = 'warning';
            else if (record.severity === 'Info') sevColor = 'blue';

            return (
              <Flex vertical gap={3} align="flex-start">
                <Flex align="center" gap={4} wrap="wrap">
                  <Tag color={actionColor} style={{ margin: 0 }}>
                    {action || '-'}
                  </Tag>
                  <Tag color={sevColor} style={{ margin: 0, fontSize: 10.5 }}>
                    {record.severity || 'Info'}
                  </Tag>
                </Flex>
                {record.status && record.status !== 'Success' && (
                  <Tag color="error" style={{ margin: 0, fontSize: 10 }}>
                    {record.status}
                    {record.statusCode ? ` (${record.statusCode})` : ''}
                  </Tag>
                )}
              </Flex>
            );
          },
        },
        {
          title: 'Target Entity',
          key: 'entity',
          width: '26%',
          sorter: (a: AuditLog, b: AuditLog) =>
            (a.entity || '').localeCompare(b.entity || '') ||
            (a.entityType || '').localeCompare(b.entityType || ''),
          render: (_: unknown, record: AuditLog) => (
            <div>
              <Flex align="center" gap={6} wrap="wrap">
                <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
                  {record.entityType || 'General'}
                </Tag>
                <Text strong style={{ fontSize: 12.5 }}>
                  {record.entity}
                </Text>
              </Flex>
              {record.details && (
                <Text
                  type="secondary"
                  ellipsis={{ tooltip: record.details }}
                  style={{ display: 'block', fontSize: 11.5, marginTop: 2, maxWidth: 260 }}
                >
                  {record.details}
                </Text>
              )}
            </div>
          ),
        },
        {
          title: 'Inspect',
          key: 'inspect',
          width: 70,
          render: (_: unknown, record: AuditLog) => (
            <Button
              size="small"
              type="text"
              shape="circle"
              icon={<EyeOutlined />}
              aria-label={`Inspect event ${record.id}`}
              onClick={() => onInspectLog(record)}
            />
          ),
        },
      ],
      [onInspectLog],
    );

    return (
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={
          pagination !== undefined
            ? pagination
            : {
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
                showTotal: (total) => `Total ${total} activity records`,
              }
        }
      />
    );
  },
);

AuditTable.displayName = 'AuditTable';
