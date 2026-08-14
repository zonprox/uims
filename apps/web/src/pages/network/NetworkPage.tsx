import { Tabs, Tag, Button } from 'antd';
import { ProTable, ProColumns } from '@ant-design/pro-components';
import PageContainer from '../../components/PageContainer';
import { PlusOutlined } from '@ant-design/icons';

interface IPAddress {
  id: string;
  ip: string;
  hostname: string;
  mac: string;
  subnet: string;
  status: string;
}

export default function NetworkPage() {
  const ipColumns: ProColumns<IPAddress>[] = [
    { title: 'IP Address', dataIndex: 'ip', key: 'ip' },
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname' },
    { title: 'MAC Address', dataIndex: 'mac', key: 'mac' },
    { title: 'Subnet', dataIndex: 'subnet', key: 'subnet' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (_, record) => <Tag color={record.status === 'Allocated' ? 'blue' : 'success'}>{record.status}</Tag>
    },
    {
      title: 'Actions',
      valueType: 'option',
      key: 'option',
      render: () => [<a key="edit">Edit</a>],
    },
  ];

  const ipData: IPAddress[] = [
    { id: '1', ip: '192.168.1.10', hostname: 'server-01', mac: '00:1B:44:11:3A:B7', subnet: '192.168.1.0/24', status: 'Allocated' },
    { id: '2', ip: '192.168.1.11', hostname: 'desktop-user1', mac: '00:1B:44:22:3A:B8', subnet: '192.168.1.0/24', status: 'Allocated' },
  ];

  const items = [
    {
      key: 'ips',
      label: 'IP Addresses',
      children: (
        <ProTable<IPAddress>
          columns={ipColumns}
          dataSource={ipData}
          rowKey="id"
          search={{ labelWidth: 'auto' }}
          pagination={{ pageSize: 10 }}
          toolBarRender={() => [
            <Button key="button" icon={<PlusOutlined />} type="primary">
              Allocate IP
            </Button>,
          ]}
        />
      ),
    },
    {
      key: 'subnets',
      label: 'Subnets',
      children: <div>Subnets management would go here.</div>,
    },
    {
      key: 'vlans',
      label: 'VLANs',
      children: <div>VLAN management would go here.</div>,
    },
  ];

  return (
    <PageContainer title="Network & IP Management" breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Network' }]}>
      <Tabs defaultActiveKey="ips" items={items} />
    </PageContainer>
  );
}
