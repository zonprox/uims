import { PlusOutlined } from '@ant-design/icons';
import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Progress, Tag } from 'antd';
import PageContainer from '../../components/PageContainer';

interface License {
  id: string;
  name: string;
  vendor: string;
  type: string;
  totalSeats: number;
  usedSeats: number;
  expiryDate: string;
  status: string;
}

export default function LicensesPage() {
  const columns: ProColumns<License>[] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Vendor', dataIndex: 'vendor', key: 'vendor' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    {
      title: 'Seats (Used / Total)',
      key: 'seats',
      render: (_, record) => (
        <div style={{ width: 150 }}>
          <Progress
            percent={Math.round((record.usedSeats / record.totalSeats) * 100)}
            size="small"
          />
          <div style={{ fontSize: '12px', color: '#888' }}>
            {record.usedSeats} / {record.totalSeats}
          </div>
        </div>
      ),
    },
    { title: 'Expiry Date', dataIndex: 'expiryDate', key: 'expiryDate', valueType: 'date' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.status === 'Active' ? 'success' : 'error'}>{record.status}</Tag>
      ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      key: 'option',
      render: () => [
        <Button type="link" size="small" key="manage">
          Manage
        </Button>,
      ],
    },
  ];

  const dataSource: License[] = [
    {
      id: '1',
      name: 'Office 365 E3',
      vendor: 'Microsoft',
      type: 'Subscription',
      totalSeats: 100,
      usedSeats: 85,
      expiryDate: '2024-12-31',
      status: 'Active',
    },
    {
      id: '2',
      name: 'Creative Cloud All Apps',
      vendor: 'Adobe',
      type: 'Subscription',
      totalSeats: 20,
      usedSeats: 19,
      expiryDate: '2024-05-15',
      status: 'Active',
    },
  ];

  return (
    <PageContainer
      title="License Management"
      breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Licenses' }]}
    >
      <ProTable<License>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        headerTitle="License List"
        toolBarRender={() => [
          <Button key="button" icon={<PlusOutlined />} type="primary">
            Add License
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
