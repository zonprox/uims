import { PlusOutlined } from '@ant-design/icons';
import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Tabs, Tag } from 'antd';
import PageContainer from '../../components/PageContainer';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  status: string;
}

export default function DirectoryPage() {
  const userColumns: ProColumns<User>[] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.status === 'Active' ? 'success' : 'default'}>{record.status}</Tag>
      ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      key: 'option',
      render: () => [
        <Button type="link" size="small" key="edit">
          Edit
        </Button>,
        <Button type="link" size="small" key="reset">
          Reset Password
        </Button>,
      ],
    },
  ];

  const userData: User[] = [
    {
      id: '1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      department: 'Engineering',
      status: 'Active',
    },
    {
      id: '2',
      name: 'Bob Jones',
      email: 'bob@example.com',
      department: 'Sales',
      status: 'Inactive',
    },
  ];

  const items = [
    {
      key: 'users',
      label: 'Users',
      children: (
        <ProTable<User>
          columns={userColumns}
          dataSource={userData}
          rowKey="id"
          search={{ labelWidth: 'auto' }}
          pagination={{ pageSize: 10 }}
          toolBarRender={() => [
            <Button key="button" icon={<PlusOutlined />} type="primary">
              Add User
            </Button>,
          ]}
        />
      ),
    },
    {
      key: 'groups',
      label: 'Groups',
      children: <div>Group management table would go here.</div>,
    },
  ];

  return (
    <PageContainer
      title="Directory Services"
      breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Directory' }]}
    >
      <Tabs defaultActiveKey="users" items={items} />
    </PageContainer>
  );
}
