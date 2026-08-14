import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  InboxOutlined,
  MailOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  SettingOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export interface Mailbox {
  id: string;
  address: string;
  displayName: string;
  type: 'User' | 'Shared' | 'Resource' | 'Executive';
  quotaUsed: number; // in GB
  quotaTotal: number; // in GB
  status: 'Active' | 'Warning' | 'Suspended';
  department: string;
  forwardingAddress?: string;
  autoReplyEnabled: boolean;
  aliases: string[];
}

export interface DistributionGroup {
  id: string;
  address: string;
  name: string;
  memberCount: number;
  scope: 'Internal Only' | 'Public / External';
  managedBy: string;
}

const INITIAL_MAILBOXES: Mailbox[] = [
  {
    id: '1',
    address: 'alex.johnson@company.com',
    displayName: 'Alex Johnson (IT)',
    type: 'Executive',
    quotaUsed: 14.8,
    quotaTotal: 100,
    status: 'Active',
    department: 'IT & Infrastructure',
    autoReplyEnabled: false,
    aliases: ['alex@company.com', 'cio@company.com'],
  },
  {
    id: '2',
    address: 'sales-team@company.com',
    displayName: 'Global Sales Shared Inbox',
    type: 'Shared',
    quotaUsed: 47.6,
    quotaTotal: 50,
    status: 'Warning',
    department: 'Sales',
    autoReplyEnabled: true,
    aliases: ['deals@company.com', 'inquiries@company.com'],
  },
  {
    id: '3',
    address: 'it-support@company.com',
    displayName: 'IT Helpdesk Inbound',
    type: 'Shared',
    quotaUsed: 22.4,
    quotaTotal: 100,
    status: 'Active',
    department: 'IT & Infrastructure',
    autoReplyEnabled: true,
    aliases: ['helpdesk@company.com', 'support@company.com'],
  },
  {
    id: '4',
    address: 'marcus.vance@company.com',
    displayName: 'Marcus Vance',
    type: 'User',
    quotaUsed: 8.2,
    quotaTotal: 50,
    status: 'Active',
    department: 'Product & Design',
    autoReplyEnabled: false,
    aliases: ['marcus@company.com'],
  },
  {
    id: '5',
    address: 'boardroom-ny@company.com',
    displayName: 'NY Executive Boardroom Calendar',
    type: 'Resource',
    quotaUsed: 1.1,
    quotaTotal: 10,
    status: 'Active',
    department: 'Facilities',
    autoReplyEnabled: true,
    aliases: ['room-ny-401@company.com'],
  },
];

const INITIAL_GROUPS: DistributionGroup[] = [
  {
    id: 'g1',
    address: 'all-employees@company.com',
    name: 'All Company Staff',
    memberCount: 148,
    scope: 'Internal Only',
    managedBy: 'HR Dept',
  },
  {
    id: 'g2',
    address: 'engineering-core@company.com',
    name: 'Engineering Core Team',
    memberCount: 48,
    scope: 'Internal Only',
    managedBy: 'David Kim',
  },
  {
    id: 'g3',
    address: 'press-media@company.com',
    name: 'Public Relations & Press',
    memberCount: 6,
    scope: 'Public / External',
    managedBy: 'Elena Rostova',
  },
  {
    id: 'g4',
    address: 'security-response@company.com',
    name: 'Security Incident Response',
    memberCount: 8,
    scope: 'Public / External',
    managedBy: 'Sarah Chen',
  },
];

export default function EmailPage() {
  const { message } = App.useApp();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>(INITIAL_MAILBOXES);
  const [groups, setGroups] = useState<DistributionGroup[]>(INITIAL_GROUPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('mailboxes');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMailbox, setEditingMailbox] = useState<Mailbox | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMailbox, setSelectedMailbox] = useState<Mailbox | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();

  // Metrics
  const totalUsedStorage = mailboxes.reduce((sum, m) => sum + m.quotaUsed, 0).toFixed(1);
  const totalMaxStorage = mailboxes.reduce((sum, m) => sum + m.quotaTotal, 0);
  const nearQuotaCount = mailboxes.filter((m) => m.quotaUsed / m.quotaTotal > 0.85).length;

  const filteredMailboxes = mailboxes.filter((mb) => {
    const matchesSearch =
      mb.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mb.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mb.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || mb.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleOpenCreateModal = () => {
    setEditingMailbox(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'User',
      quotaTotal: 50,
      status: 'Active',
      department: 'Engineering',
      autoReplyEnabled: false,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (mailbox: Mailbox) => {
    setEditingMailbox(mailbox);
    form.setFieldsValue({
      ...mailbox,
      aliasesText: mailbox.aliases.join(', '),
    });
    setModalOpen(true);
  };

  const handleSaveMailbox = async () => {
    try {
      const values = await form.validateFields();
      const aliasesList = values.aliasesText
        ? values.aliasesText
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

      const formattedMailbox: Mailbox = {
        id: editingMailbox ? editingMailbox.id : String(Date.now()),
        address: values.address,
        displayName: values.displayName,
        type: values.type,
        quotaUsed: editingMailbox ? editingMailbox.quotaUsed : 0.1,
        quotaTotal: values.quotaTotal,
        status: values.status || 'Active',
        department: values.department,
        forwardingAddress: values.forwardingAddress,
        autoReplyEnabled: values.autoReplyEnabled ?? false,
        aliases: aliasesList,
      };

      if (editingMailbox) {
        setMailboxes((prev) =>
          prev.map((m) => (m.id === editingMailbox.id ? formattedMailbox : m)),
        );
        message.success(`Mailbox "${formattedMailbox.address}" updated.`);
      } else {
        setMailboxes((prev) => [formattedMailbox, ...prev]);
        message.success(`Mailbox "${formattedMailbox.address}" provisioned on Exchange.`);
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMailbox = (id: string) => {
    setMailboxes((prev) => prev.filter((m) => m.id !== id));
    message.success('Mailbox deleted from exchange server.');
  };

  const handleShowSettings = (mb: Mailbox) => {
    setSelectedMailbox(mb);
    setDrawerOpen(true);
  };

  const handleCreateGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      const newGroup: DistributionGroup = {
        id: String(Date.now()),
        name: values.name,
        address: values.address,
        memberCount: values.memberCount || 1,
        scope: values.scope,
        managedBy: values.managedBy || 'IT Admin',
      };
      setGroups((prev) => [newGroup, ...prev]);
      message.success(`Distribution Group "${newGroup.name}" created.`);
      setGroupModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      title: 'Email Account',
      dataIndex: 'address',
      key: 'address',
      render: (address: string, record: Mailbox) => (
        <div>
          <Text
            strong
            style={{ fontSize: 13, cursor: 'pointer', color: '#1677ff' }}
            onClick={() => handleShowSettings(record)}
          >
            {address}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {record.displayName} • {record.department}
          </Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        let color = 'blue';
        if (type === 'Shared') color = 'purple';
        if (type === 'Resource') color = 'green';
        if (type === 'Executive') color = 'gold';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'Storage Quota Utilization',
      key: 'quota',
      width: 220,
      render: (_: any, record: Mailbox) => {
        const percent = Math.round((record.quotaUsed / record.quotaTotal) * 100);
        let strokeColor = '#52c41a';
        if (percent > 90) strokeColor = '#ff4d4f';
        else if (percent > 75) strokeColor = '#faad14';

        return (
          <div>
            <Flex justify="space-between" align="center" style={{ fontSize: 12, marginBottom: 2 }}>
              <Text strong>
                {record.quotaUsed} GB / {record.quotaTotal} GB
              </Text>
              <Text type="secondary">{percent}%</Text>
            </Flex>
            <Progress percent={percent} strokeColor={strokeColor} size="small" showInfo={false} />
            {percent > 90 && (
              <Tag color="error" style={{ fontSize: 10, marginTop: 2 }}>
                Critical Quota Limit
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Routing & Features',
      key: 'features',
      render: (_: any, record: Mailbox) => (
        <Space size="small">
          {record.autoReplyEnabled && <Tag color="cyan">Auto-Reply</Tag>}
          {record.forwardingAddress && <Tag color="geekblue">Forwarding</Tag>}
          {record.aliases.length > 0 && <Tag color="default">+{record.aliases.length} Aliases</Tag>}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Mailbox) => (
        <Space size="small">
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleShowSettings(record)}
          >
            Configure
          </Button>
          <Tooltip title="Edit">
            <Button
              type="text"
              shape="circle"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this mailbox?"
            description="All stored mail items will be moved to retention archive."
            onConfirm={() => handleDeleteMailbox(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Enterprise Email & Messaging"
      subtitle="Exchange mailbox provisioning, storage quota limits, aliases, and distribution groups."
      breadcrumbs={[{ title: 'Email' }]}
      stats={[
        {
          title: 'Total Mailboxes',
          value: mailboxes.length,
          prefix: <InboxOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Total Storage Consumed',
          value: `${totalUsedStorage} GB`,
          suffix: `/ ${totalMaxStorage} GB`,
          prefix: <CloudUploadOutlined />,
          color: '#52c41a',
        },
        {
          title: 'Distribution Groups',
          value: groups.length,
          prefix: <TeamOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Near Quota Limit (>85%)',
          value: nearQuotaCount,
          prefix: <WarningOutlined />,
          color: nearQuotaCount > 0 ? '#ff4d4f' : '#8c8c8c',
        },
      ]}
      extra={
        <Space>
          <Button icon={<TeamOutlined />} onClick={() => setGroupModalOpen(true)}>
            New Distribution Group
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Provision Mailbox
          </Button>
        </Space>
      }
    >
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'mailboxes',
              label: (
                <Space>
                  <MailOutlined />
                  <span>Corporate Mailboxes</span>
                </Space>
              ),
              children: (
                <div>
                  <Row
                    gutter={[16, 16]}
                    align="middle"
                    justify="space-between"
                    style={{ marginBottom: 16 }}
                  >
                    <Col xs={24} md={10}>
                      <Input
                        placeholder="Search mailboxes by address, display name, department..."
                        prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={14}>
                      <Flex gap={12} justify="flex-end" wrap>
                        <Select
                          value={typeFilter}
                          onChange={setTypeFilter}
                          style={{ width: 160 }}
                          placeholder="Type"
                        >
                          <Option value="all">All Mailbox Types</Option>
                          <Option value="User">User</Option>
                          <Option value="Shared">Shared Inbox</Option>
                          <Option value="Resource">Resource / Room</Option>
                          <Option value="Executive">Executive</Option>
                        </Select>

                        {(searchQuery || typeFilter !== 'all') && (
                          <Button
                            onClick={() => {
                              setSearchQuery('');
                              setTypeFilter('all');
                            }}
                          >
                            Reset
                          </Button>
                        )}
                      </Flex>
                    </Col>
                  </Row>

                  <Table
                    columns={columns}
                    dataSource={filteredMailboxes}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },
            {
              key: 'groups',
              label: (
                <Space>
                  <TeamOutlined />
                  <span>Distribution Lists ({groups.length})</span>
                </Space>
              ),
              children: (
                <Table
                  dataSource={groups}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Distribution Group Name',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string, rec: DistributionGroup) => (
                        <div>
                          <Text strong>{name}</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            {rec.address}
                          </Text>
                        </div>
                      ),
                    },
                    {
                      title: 'Members',
                      dataIndex: 'memberCount',
                      key: 'memberCount',
                      render: (count: number) => <Tag color="blue">{count} Recipients</Tag>,
                    },
                    {
                      title: 'Delivery Scope',
                      dataIndex: 'scope',
                      key: 'scope',
                      render: (scope: string) => (
                        <Tag color={scope === 'Internal Only' ? 'default' : 'green'}>{scope}</Tag>
                      ),
                    },
                    { title: 'Manager / Owner', dataIndex: 'managedBy', key: 'managedBy' },
                  ]}
                />
              ),
            },
            {
              key: 'antispam',
              label: (
                <Space>
                  <SafetyCertificateOutlined />
                  <span>Mail Routing & Anti-Spam</span>
                </Space>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card size="small" title="SPF, DKIM & DMARC Protection Status">
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="SPF Record">
                          <Tag color="success">v=spf1 include:spf.protection.outlook.com ~all</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="DKIM Signing">
                          <Tag color="success">2048-bit RSA Active</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="DMARC Policy">
                          <Tag color="success">p=reject (100% Enforced)</Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="Inbound Quarantine & Filtering">
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Threats Blocked (24h)">
                          1,429 Spam / 42 Phishing
                        </Descriptions.Item>
                        <Descriptions.Item label="Zero-Hour Auto Purge (ZAP)">
                          Enabled
                        </Descriptions.Item>
                        <Descriptions.Item label="TLS Encryption Rate">
                          100% Inbound / Outbound
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Provision Mailbox Modal */}
      <Modal
        title={
          editingMailbox
            ? `Edit Mailbox: ${editingMailbox.address}`
            : 'Provision New Exchange Mailbox'
        }
        open={modalOpen}
        onOk={handleSaveMailbox}
        onCancel={() => setModalOpen(false)}
        width={640}
        okText={editingMailbox ? 'Save Changes' : 'Create Mailbox'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="Email Address"
                name="address"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="username@company.com" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Display Name" name="displayName" rules={[{ required: true }]}>
                <Input placeholder="e.g. Finance Shared Inbox" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Mailbox Type" name="type" rules={[{ required: true }]}>
                <Select>
                  <Option value="User">User</Option>
                  <Option value="Shared">Shared Inbox</Option>
                  <Option value="Resource">Resource / Room</Option>
                  <Option value="Executive">Executive</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Storage Limit (GB)" name="quotaTotal" rules={[{ required: true }]}>
                <InputNumber min={5} max={200} style={{ width: '100%' }} suffix="GB" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                <Input placeholder="e.g. Sales" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Alternate Aliases (comma separated)" name="aliasesText">
            <Input placeholder="alias1@company.com, alias2@company.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Forward Copies To" name="forwardingAddress">
                <Input placeholder="e.g. backup-inbox@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Enable Out-of-Office Auto-Reply"
                name="autoReplyEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Distribution Group Modal */}
      <Modal
        title="Create Distribution Group"
        open={groupModalOpen}
        onOk={handleCreateGroup}
        onCancel={() => setGroupModalOpen(false)}
        okText="Create Group"
      >
        <Form
          form={groupForm}
          layout="vertical"
          initialValues={{ scope: 'Internal Only', memberCount: 5 }}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="Group Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. All Design Team" />
          </Form.Item>
          <Form.Item
            label="Distribution Email Address"
            name="address"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input placeholder="design-all@company.com" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Delivery Scope" name="scope">
                <Select>
                  <Option value="Internal Only">Internal Only</Option>
                  <Option value="Public / External">Public / External</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Manager / Owner" name="managedBy">
                <Input placeholder="e.g. Marcus Vance" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Mailbox Settings Drawer */}
      {selectedMailbox && (
        <Drawer
          title={
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {selectedMailbox.displayName}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedMailbox.address}
              </Text>
            </div>
          }
          width={480}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Descriptions
            title="Mailbox Configurations"
            bordered
            size="small"
            column={1}
            style={{ marginBottom: 20 }}
          >
            <Descriptions.Item label="Primary Email">{selectedMailbox.address}</Descriptions.Item>
            <Descriptions.Item label="Type">{selectedMailbox.type}</Descriptions.Item>
            <Descriptions.Item label="Department">{selectedMailbox.department}</Descriptions.Item>
            <Descriptions.Item label="Storage Usage">
              {selectedMailbox.quotaUsed} GB of {selectedMailbox.quotaTotal} GB (
              {Math.round((selectedMailbox.quotaUsed / selectedMailbox.quotaTotal) * 100)}%)
            </Descriptions.Item>
            <Descriptions.Item label="Auto-Responder">
              {selectedMailbox.autoReplyEnabled ? (
                <Tag color="success">Active</Tag>
              ) : (
                <Tag color="default">Disabled</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5}>Configured Email Aliases</Title>
          <List
            size="small"
            bordered
            dataSource={selectedMailbox.aliases}
            locale={{ emptyText: 'No alias configured' }}
            renderItem={(alias) => (
              <List.Item>
                <Text code>{alias}</Text>
              </List.Item>
            )}
          />
        </Drawer>
      )}
    </PageContainer>
  );
}
