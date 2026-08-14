import { Progress, Tag, Button } from 'antd';
import { ProTable, ProColumns } from '@ant-design/pro-components';
import PageContainer from '../../components/PageContainer';
import { PlusOutlined } from '@ant-design/icons';

interface Mailbox {
  id: string;
  address: string;
  displayName: string;
  quotaUsed: number;
  quotaTotal: number;
  status: string;
}

export default function EmailPage() {
  const columns: ProColumns<Mailbox>[] = [
    { title: 'Email Address', dataIndex: 'address', key: 'address' },
    { title: 'Display Name', dataIndex: 'displayName', key: 'displayName' },
    { 
      title: 'Quota Usage', 
      key: 'quota',
      render: (_, record) => {
        const percent = Math.round((record.quotaUsed / record.quotaTotal) * 100);
        return (
          <div style={{ width: 150 }}>
            <Progress percent={percent} size="small" status={percent > 90 ? 'exception' : 'normal'} />
            <div style={{ fontSize: '12px', color: '#888' }}>{record.quotaUsed}GB / {record.quotaTotal}GB</div>
          </div>
        );
      }
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (_, record) => <Tag color={record.status === 'Active' ? 'success' : 'default'}>{record.status}</Tag>
    },
    {
      title: 'Actions',
      valueType: 'option',
      key: 'option',
      render: () => [<a key="settings">Settings</a>],
    },
  ];

  const dataSource: Mailbox[] = [
    { id: '1', address: 'admin@company.com', displayName: 'Admin Account', quotaUsed: 4.5, quotaTotal: 50, status: 'Active' },
    { id: '2', address: 'sales@company.com', displayName: 'Sales Shared', quotaUsed: 48.2, quotaTotal: 50, status: 'Active' },
  ];

  return (
    <PageContainer title="Email Management" breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Email' }]}>
      <ProTable<Mailbox>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        headerTitle="Mailboxes"
        toolBarRender={() => [
          <Button key="button" icon={<PlusOutlined />} type="primary">
            Create Mailbox
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
