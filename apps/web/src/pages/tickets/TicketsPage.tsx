import { PlusOutlined } from '@ant-design/icons';
import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Tag } from 'antd';
import PageContainer from '../../components/PageContainer';

interface Ticket {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignee: string;
  created: string;
}

export default function TicketsPage() {
  const columns: ProColumns<Ticket>[] = [
    { title: 'Ticket ID', dataIndex: 'id', key: 'id' },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (_, record) => {
        const colors: Record<string, string> = {
          High: 'red',
          Medium: 'orange',
          Low: 'green',
        };
        return <Tag color={colors[record.priority] || 'default'}>{record.priority}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const colors: Record<string, string> = {
          Open: 'blue',
          'In Progress': 'processing',
          Closed: 'default',
        };
        return <Tag color={colors[record.status] || 'default'}>{record.status}</Tag>;
      },
    },
    { title: 'Assignee', dataIndex: 'assignee', key: 'assignee' },
    { title: 'Created', dataIndex: 'created', key: 'created', valueType: 'dateTime' },
    {
      title: 'Actions',
      valueType: 'option',
      key: 'option',
      render: () => [
        <Button type="link" size="small" key="view">
          View
        </Button>,
        <Button type="link" size="small" key="resolve">
          Resolve
        </Button>,
      ],
    },
  ];

  const dataSource: Ticket[] = [
    {
      id: 'TKT-1001',
      title: 'Cannot access VPN',
      priority: 'High',
      status: 'Open',
      assignee: 'Unassigned',
      created: '2023-10-27T08:30:00Z',
    },
    {
      id: 'TKT-1002',
      title: 'Request for new monitor',
      priority: 'Low',
      status: 'In Progress',
      assignee: 'IT Support',
      created: '2023-10-26T14:15:00Z',
    },
  ];

  return (
    <PageContainer
      title="Helpdesk & Tickets"
      breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Tickets' }]}
    >
      <ProTable<Ticket>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        headerTitle="Ticket Queue"
        toolBarRender={() => [
          <Button key="button" icon={<PlusOutlined />} type="primary">
            New Ticket
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
