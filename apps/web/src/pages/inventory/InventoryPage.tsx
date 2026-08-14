import { Tag, Button } from 'antd';
import { ProTable, ProColumns } from '@ant-design/pro-components';
import PageContainer from '../../components/PageContainer';
import { PlusOutlined } from '@ant-design/icons';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  location: string;
  status: string;
}

export default function InventoryPage() {
  const columns: ProColumns<InventoryItem>[] = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Item Name', dataIndex: 'name', key: 'name' },
    { title: 'Quantity in Stock', dataIndex: 'quantity', key: 'quantity', valueType: 'digit' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (_, record) => {
        let color = 'success';
        if (record.quantity === 0) color = 'error';
        else if (record.quantity < 5) color = 'warning';
        return <Tag color={color}>{record.quantity > 0 ? 'In Stock' : 'Out of Stock'}</Tag>;
      }
    },
    {
      title: 'Actions',
      valueType: 'option',
      key: 'option',
      render: () => [<a key="restock">Restock</a>, <a key="edit">Edit</a>],
    },
  ];

  const dataSource: InventoryItem[] = [
    { id: '1', sku: 'CAB-RJ45-2M', name: 'Cat6 Cable 2m', quantity: 45, location: 'Storage Room A', status: 'In Stock' },
    { id: '2', sku: 'ACC-MSE-WLR', name: 'Wireless Mouse', quantity: 2, location: 'Storage Room A', status: 'Low Stock' },
  ];

  return (
    <PageContainer title="Hardware Inventory" breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Inventory' }]}>
      <ProTable<InventoryItem>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        headerTitle="Inventory Stock"
        toolBarRender={() => [
          <Button key="button" icon={<PlusOutlined />} type="primary">
            Add Item
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
