import { Tag, Button, Space } from 'antd';
import { ProTable, ProColumns } from '@ant-design/pro-components';
import PageContainer from '../../components/PageContainer';
import { PlusOutlined } from '@ant-design/icons';

interface Asset {
  id: string;
  tag: string;
  name: string;
  category: string;
  status: string;
  assignedTo: string;
  location: string;
  purchaseDate: string;
}

export default function AssetsPage() {
  const columns: ProColumns<Asset>[] = [
    { title: 'Asset Tag', dataIndex: 'tag', key: 'tag' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (_, record) => {
        const color = record.status === 'Active' ? 'success' : record.status === 'In Repair' ? 'warning' : 'default';
        return <Tag color={color}>{record.status}</Tag>;
      }
    },
    { title: 'Assigned To', dataIndex: 'assignedTo', key: 'assignedTo' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Purchase Date', dataIndex: 'purchaseDate', key: 'purchaseDate', valueType: 'date' },
    {
      title: 'Actions',
      valueType: 'option',
      key: 'option',
      render: (text, record, _, action) => [
        <a key="edit">Edit</a>,
        <a key="view">View</a>,
      ],
    },
  ];

  const dataSource: Asset[] = [
    { id: '1', tag: 'L-1024', name: 'MacBook Pro M2', category: 'Laptop', status: 'Active', assignedTo: 'John Doe', location: 'NY Office', purchaseDate: '2023-01-15' },
    { id: '2', tag: 'D-2048', name: 'Dell UltraSharp 27', category: 'Monitor', status: 'In Repair', assignedTo: 'Unassigned', location: 'IT Room', purchaseDate: '2022-11-10' },
  ];

  return (
    <PageContainer title="Asset Management" breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Assets' }]}>
      <ProTable<Asset>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        dateFormatter="string"
        headerTitle="Asset List"
        toolBarRender={() => [
          <Button key="button" icon={<PlusOutlined />} type="primary">
            New Asset
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
