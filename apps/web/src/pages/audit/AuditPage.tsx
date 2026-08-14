import { ProTable, ProColumns } from '@ant-design/pro-components';
import PageContainer from '../../components/PageContainer';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  details: string;
}

export default function AuditPage() {
  const columns: ProColumns<AuditLog>[] = [
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', valueType: 'dateTime' },
    { title: 'User', dataIndex: 'user', key: 'user' },
    { title: 'Action', dataIndex: 'action', key: 'action' },
    { title: 'Entity', dataIndex: 'entity', key: 'entity' },
    { title: 'Details', dataIndex: 'details', key: 'details', ellipsis: true },
  ];

  const dataSource: AuditLog[] = [
    { id: '1', timestamp: '2023-10-27T10:05:00Z', user: 'admin@company.com', action: 'CREATE', entity: 'Asset L-1024', details: 'Added new MacBook Pro M2 to inventory.' },
    { id: '2', timestamp: '2023-10-27T09:12:00Z', user: 'system', action: 'UPDATE', entity: 'License O365', details: 'Automated sync: updated used seats count.' },
  ];

  return (
    <PageContainer title="Audit & Compliance" breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Audit Logs' }]}>
      <ProTable<AuditLog>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 20 }}
        headerTitle="System Audit Logs"
        toolBarRender={() => [
          <Button key="button" icon={<DownloadOutlined />}>
            Export CSV
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
