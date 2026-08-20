import { Card, Table, Tag, Typography } from 'antd';
import React, { useMemo } from 'react';
import type { DNSRecord } from '../../../services/network.service';

const { Text } = Typography;

export interface DnsTableProps {
  dnsRecords: Array<DNSRecord>;
}

export const DnsTable: React.FC<DnsTableProps> = React.memo(({ dnsRecords }) => {
  const dnsColumns = useMemo(
    () => [
      {
        title: 'Hostname & FQDN',
        dataIndex: 'host',
        key: 'host',
        render: (host: string) => (
          <Text strong code>
            {host}
          </Text>
        ),
      },
      {
        title: 'Record Type',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Tag color="blue">{type}</Tag>,
      },
      {
        title: 'Target Destination',
        dataIndex: 'target',
        key: 'target',
        render: (target: string) => <Text code>{target}</Text>,
      },
      {
        title: 'TTL',
        dataIndex: 'ttl',
        key: 'ttl',
        render: (ttl: string) => <Text type="secondary">{ttl}</Text>,
      },
    ],
    [],
  );

  return (
    <Card size="small" styles={{ body: { padding: 0 } }}>
      <Table
        columns={dnsColumns}
        dataSource={dnsRecords}
        rowKey="id"
        pagination={false}
        size="middle"
      />
    </Card>
  );
});

DnsTable.displayName = 'DnsTable';
