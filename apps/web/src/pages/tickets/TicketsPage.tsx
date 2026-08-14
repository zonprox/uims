import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
  SendOutlined,
  TableOutlined,
  TeamOutlined,
  UserOutlined,
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
  List,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { useAuthStore } from '../../stores/auth.store';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export interface TicketMessage {
  id: string;
  sender: string;
  isStaff: boolean;
  avatarColor?: string;
  content: string;
  time: string;
}

export interface Ticket {
  id: string;
  title: string;
  category: 'Hardware' | 'Software' | 'Network' | 'Access & SSO' | 'Email';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Pending User' | 'Resolved' | 'Closed';
  requesterName: string;
  requesterEmail: string;
  assignee: string;
  affectedAsset?: string;
  created: string;
  slaDeadline: string;
  messages: TicketMessage[];
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'TKT-1001',
    title: 'Cannot access internal VPN from remote home network',
    category: 'Network',
    priority: 'Urgent',
    status: 'Open',
    requesterName: 'Marcus Vance',
    requesterEmail: 'marcus.vance@company.com',
    assignee: 'Unassigned',
    affectedAsset: 'AST-1024 (MacBook Pro 16)',
    created: '2024-03-15 08:30',
    slaDeadline: '2 hours left',
    messages: [
      {
        id: 'm1',
        sender: 'Marcus Vance',
        isStaff: false,
        content:
          'Hi IT Team, WireGuard client gives handshake timeout when connecting to NY-GW01 since this morning.',
        time: 'Today, 08:30 AM',
      },
    ],
  },
  {
    id: 'TKT-1002',
    title: 'Request second external monitor for design desk',
    category: 'Hardware',
    priority: 'Low',
    status: 'In Progress',
    requesterName: 'Elena Rostova',
    requesterEmail: 'elena.rostova@company.com',
    assignee: 'Sarah Chen',
    created: '2024-03-14 14:15',
    slaDeadline: '1 day left',
    messages: [
      {
        id: 'm2',
        sender: 'Elena Rostova',
        isStaff: false,
        content: 'Need an extra 27" 4K monitor for video campaign editing.',
        time: 'Yesterday, 02:15 PM',
      },
      {
        id: 'm3',
        sender: 'Sarah Chen',
        isStaff: true,
        avatarColor: '#1677ff',
        content: 'Approved by manager. We have Dell U2723QE in stock in Room A. Will deploy today.',
        time: 'Yesterday, 03:00 PM',
      },
    ],
  },
  {
    id: 'TKT-1003',
    title: 'Figma Enterprise Seat Invitation Not Received',
    category: 'Software',
    priority: 'High',
    status: 'Open',
    requesterName: 'David Kim',
    requesterEmail: 'david.kim@company.com',
    assignee: 'Alex Johnson',
    created: '2024-03-15 09:10',
    slaDeadline: '3 hours left',
    messages: [
      {
        id: 'm4',
        sender: 'David Kim',
        isStaff: false,
        content: 'Need editor seat license for mobile design sprint starting at noon.',
        time: 'Today, 09:10 AM',
      },
    ],
  },
  {
    id: 'TKT-1004',
    title: 'Reset Password & 2FA MFA Token for Office 365',
    category: 'Access & SSO',
    priority: 'Medium',
    status: 'Resolved',
    requesterName: 'Thomas Wright',
    requesterEmail: 'thomas.wright@company.com',
    assignee: 'Sarah Chen',
    created: '2024-03-13 11:00',
    slaDeadline: 'Met (Resolved in 24m)',
    messages: [
      {
        id: 'm5',
        sender: 'Thomas Wright',
        isStaff: false,
        content: 'Switched phone and lost Microsoft Authenticator app seed.',
        time: 'Mar 13, 11:00 AM',
      },
      {
        id: 'm6',
        sender: 'Sarah Chen',
        isStaff: true,
        avatarColor: '#1677ff',
        content: 'Identity verified over secure voice channel. MFA token reset completed.',
        time: 'Mar 13, 11:24 AM',
      },
    ],
  },
];

export default function TicketsPage() {
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusTab, setStatusTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<string>('table');

  // Modals & Drawer
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');

  const [form] = Form.useForm();

  // Metrics
  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const urgentCount = tickets.filter(
    (t) => t.priority === 'Urgent' && t.status !== 'Closed',
  ).length;

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.assignee.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    let matchesTab = true;
    if (statusTab === 'open') matchesTab = ticket.status === 'Open';
    if (statusTab === 'in_progress') matchesTab = ticket.status === 'In Progress';
    if (statusTab === 'urgent')
      matchesTab = ticket.priority === 'Urgent' || ticket.priority === 'High';
    if (statusTab === 'resolved')
      matchesTab = ticket.status === 'Resolved' || ticket.status === 'Closed';

    return matchesSearch && matchesCat && matchesPriority && matchesTab;
  });

  const handleOpenCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      category: 'Hardware',
      priority: 'Medium',
      requesterName: user?.name || 'Marcus Vance',
      requesterEmail: user?.email || 'marcus.vance@company.com',
    });
    setModalOpen(true);
  };

  const handleSaveTicket = async () => {
    try {
      const values = await form.validateFields();
      const newTicket: Ticket = {
        id: `TKT-${Math.floor(1005 + Math.random() * 9000)}`,
        title: values.title,
        category: values.category,
        priority: values.priority,
        status: 'Open',
        requesterName: values.requesterName,
        requesterEmail: values.requesterEmail,
        assignee: 'Unassigned',
        affectedAsset: values.affectedAsset,
        created: dayjs().format('YYYY-MM-DD HH:mm'),
        slaDeadline: values.priority === 'Urgent' ? '2 hours left' : '24 hours left',
        messages: [
          {
            id: String(Date.now()),
            sender: values.requesterName,
            isStaff: false,
            content: values.description,
            time: 'Just now',
          },
        ],
      };

      setTickets((prev) => [newTicket, ...prev]);
      message.success(`Ticket ${newTicket.id} logged in queue.`);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDrawer = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setDrawerOpen(true);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return;

    const newMsg: TicketMessage = {
      id: String(Date.now()),
      sender: user?.name || 'IT Support',
      isStaff: true,
      avatarColor: '#1677ff',
      content: replyText,
      time: 'Just now',
    };

    const updated = {
      ...selectedTicket,
      messages: [...selectedTicket.messages, newMsg],
      status: (selectedTicket.status === 'Open'
        ? 'In Progress'
        : selectedTicket.status) as Ticket['status'],
      assignee:
        selectedTicket.assignee === 'Unassigned'
          ? user?.name || 'IT Support'
          : selectedTicket.assignee,
    };

    setSelectedTicket(updated);
    setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)));
    setReplyText('');
    message.success('Response dispatched to user.');
  };

  const handleStatusChange = (newStatus: Ticket['status']) => {
    if (!selectedTicket) return;
    const updated = { ...selectedTicket, status: newStatus };
    setSelectedTicket(updated);
    setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)));
    message.info(`Ticket status updated to: ${newStatus}`);
  };

  const columns = [
    {
      title: 'Ticket ID & Title',
      key: 'ticket',
      render: (_: any, record: Ticket) => (
        <div>
          <Flex align="center" gap={6}>
            <Text
              code
              style={{ fontWeight: 700, color: '#1677ff', cursor: 'pointer' }}
              onClick={() => handleOpenDrawer(record)}
            >
              {record.id}
            </Text>
            <Tag color="geekblue">{record.category}</Tag>
          </Flex>
          <Text
            strong
            style={{ fontSize: 13, display: 'block', marginTop: 2, cursor: 'pointer' }}
            onClick={() => handleOpenDrawer(record)}
          >
            {record.title}
          </Text>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: Ticket['priority']) => {
        let color = 'blue';
        if (priority === 'Urgent') color = 'red';
        if (priority === 'High') color = 'orange';
        if (priority === 'Low') color = 'default';
        return <Tag color={color}>{priority}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Ticket['status']) => {
        let color = 'processing';
        if (status === 'Open') color = 'blue';
        if (status === 'Pending User') color = 'warning';
        if (status === 'Resolved') color = 'success';
        if (status === 'Closed') color = 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Requester',
      dataIndex: 'requesterName',
      key: 'requesterName',
      render: (name: string, record: Ticket) => (
        <Flex align="center" gap={8}>
          <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
          <div>
            <Text style={{ fontSize: 13 }}>{name}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {record.requesterEmail}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      render: (assignee: string) =>
        assignee !== 'Unassigned' ? (
          <Tag color="cyan">{assignee}</Tag>
        ) : (
          <Tag color="default">Unassigned</Tag>
        ),
    },
    {
      title: 'SLA Target',
      dataIndex: 'slaDeadline',
      key: 'slaDeadline',
      render: (sla: string, record: Ticket) => (
        <Space size={4}>
          <ClockCircleOutlined
            style={{ color: record.priority === 'Urgent' ? '#ff4d4f' : '#8c8c8c' }}
          />
          <Text
            style={{ fontSize: 12, color: record.priority === 'Urgent' ? '#ff4d4f' : 'inherit' }}
          >
            {sla}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Ticket) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<CommentOutlined />}
            onClick={() => handleOpenDrawer(record)}
          >
            Open Thread
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Helpdesk & Incident Management"
      subtitle="Service tickets, incident triage, SLA response tracking, and resolution threads."
      breadcrumbs={[{ title: 'Tickets' }]}
      stats={[
        {
          title: 'Open Incident Queue',
          value: openCount,
          prefix: <CustomerServiceOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Currently In Progress',
          value: inProgressCount,
          prefix: <ClockCircleOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Urgent / High Priority',
          value: urgentCount,
          prefix: <WarningOutlined />,
          color: urgentCount > 0 ? '#ff4d4f' : '#8c8c8c',
        },
        {
          title: 'First Contact SLA Met',
          value: '98.2%',
          prefix: <CheckCircleOutlined />,
          color: '#52c41a',
        },
      ]}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
          Open Support Ticket
        </Button>
      }
    >
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search tickets by ID, subject, requester, assignee..."
              prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={16}>
            <Flex gap={12} justify="flex-end" wrap align="center">
              <Segmented
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Open', value: 'open' },
                  { label: 'In Progress', value: 'in_progress' },
                  { label: 'Urgent', value: 'urgent' },
                  { label: 'Resolved', value: 'resolved' },
                ]}
                value={statusTab}
                onChange={(v) => setStatusTab(v as string)}
              />

              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 140 }}
                placeholder="Category"
              >
                <Option value="all">All Categories</Option>
                <Option value="Hardware">Hardware</Option>
                <Option value="Software">Software</Option>
                <Option value="Network">Network</Option>
                <Option value="Access & SSO">Access & SSO</Option>
              </Select>

              <Segmented
                options={[
                  { value: 'table', icon: <TableOutlined /> },
                  { value: 'kanban', icon: <AppstoreOutlined /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as string)}
              />
            </Flex>
          </Col>
        </Row>

        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={filteredTickets}
            rowKey="id"
            pagination={{ pageSize: 8 }}
          />
        ) : (
          /* Kanban Board View */
          <Row gutter={[16, 16]}>
            {(['Open', 'In Progress', 'Resolved'] as const).map((colStatus) => {
              const colTickets = filteredTickets.filter((t) =>
                colStatus === 'Resolved'
                  ? t.status === 'Resolved' || t.status === 'Closed'
                  : t.status === colStatus,
              );
              return (
                <Col xs={24} md={8} key={colStatus}>
                  <Card
                    size="small"
                    title={
                      <Flex justify="space-between" align="center">
                        <span>{colStatus}</span>
                        <Badge
                          count={colTickets.length}
                          style={{
                            backgroundColor:
                              colStatus === 'Open'
                                ? '#1677ff'
                                : colStatus === 'In Progress'
                                  ? '#722ed1'
                                  : '#52c41a',
                          }}
                        />
                      </Flex>
                    }
                    style={{ background: 'rgba(140, 140, 140, 0.04)', minHeight: 400 }}
                  >
                    <Flex vertical gap={12}>
                      {colTickets.map((t) => (
                        <Card
                          key={t.id}
                          size="small"
                          className="uims-stat-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleOpenDrawer(t)}
                        >
                          <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                            <Text code strong style={{ color: '#1677ff' }}>
                              {t.id}
                            </Text>
                            <Tag
                              color={
                                t.priority === 'Urgent'
                                  ? 'red'
                                  : t.priority === 'High'
                                    ? 'orange'
                                    : 'default'
                              }
                            >
                              {t.priority}
                            </Tag>
                          </Flex>
                          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                            {t.title}
                          </Text>
                          <Flex
                            justify="space-between"
                            align="center"
                            style={{ fontSize: 11, color: '#8c8c8c' }}
                          >
                            <span>{t.requesterName}</span>
                            <span>{t.slaDeadline}</span>
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* Create Ticket Modal */}
      <Modal
        title="Open Support Ticket"
        open={modalOpen}
        onOk={handleSaveTicket}
        onCancel={() => setModalOpen(false)}
        width={680}
        okText="Submit Ticket"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Ticket Subject / Summary" name="title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Cannot connect to VPN server gateway" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select>
                  <Option value="Hardware">Hardware Issue</Option>
                  <Option value="Software">Software & Licenses</Option>
                  <Option value="Network">Network & VPN</Option>
                  <Option value="Access & SSO">Access & 2FA Password</Option>
                  <Option value="Email">Email & Mailbox</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priority Level" name="priority" rules={[{ required: true }]}>
                <Select>
                  <Option value="Urgent">Urgent (Production Blocker)</Option>
                  <Option value="High">High (Impairs Work)</Option>
                  <Option value="Medium">Medium (General Request)</Option>
                  <Option value="Low">Low (Minor Inquiry)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Requester Name" name="requesterName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Requester Email"
                name="requesterEmail"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Affected IT Asset (Optional)" name="affectedAsset">
            <Input placeholder="e.g. AST-1024 (MacBook Pro 16)" />
          </Form.Item>

          <Form.Item
            label="Detailed Description of the Issue"
            name="description"
            rules={[{ required: true }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Describe the symptoms, error messages, and reproduction steps..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Ticket Resolution & Discussion Drawer */}
      {selectedTicket && (
        <Drawer
          title={
            <div>
              <Flex align="center" gap={8}>
                <Text code strong style={{ fontSize: 16 }}>
                  {selectedTicket.id}
                </Text>
                <Tag color={selectedTicket.priority === 'Urgent' ? 'red' : 'orange'}>
                  {selectedTicket.priority}
                </Tag>
                <Tag color={selectedTicket.status === 'Resolved' ? 'success' : 'processing'}>
                  {selectedTicket.status}
                </Tag>
              </Flex>
              <Text strong style={{ fontSize: 14, display: 'block', marginTop: 4 }}>
                {selectedTicket.title}
              </Text>
            </div>
          }
          width={640}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          {/* Ticket Metadata Bar */}
          <Descriptions size="small" bordered column={2} style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Requester">{selectedTicket.requesterName}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedTicket.requesterEmail}</Descriptions.Item>
            <Descriptions.Item label="Assignee">{selectedTicket.assignee}</Descriptions.Item>
            <Descriptions.Item label="SLA Target">{selectedTicket.slaDeadline}</Descriptions.Item>
            {selectedTicket.affectedAsset && (
              <Descriptions.Item label="Asset Tag" span={2}>
                <Tag color="blue">{selectedTicket.affectedAsset}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Quick Status Transitions */}
          <Flex gap={8} style={{ marginBottom: 20 }}>
            <Button size="small" onClick={() => handleStatusChange('In Progress')}>
              Set In Progress
            </Button>
            <Button size="small" onClick={() => handleStatusChange('Pending User')}>
              Wait on User
            </Button>
            <Button size="small" type="primary" onClick={() => handleStatusChange('Resolved')}>
              Resolve Ticket
            </Button>
            <Button size="small" danger onClick={() => handleStatusChange('Closed')}>
              Close
            </Button>
          </Flex>

          <Divider style={{ margin: '12px 0' }}>Conversation Stream</Divider>

          {/* Messages Stream */}
          <List
            dataSource={selectedTicket.messages}
            renderItem={(msg) => (
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 10,
                  background: msg.isStaff
                    ? 'rgba(22, 119, 255, 0.08)'
                    : 'rgba(140, 140, 140, 0.06)',
                  border: msg.isStaff
                    ? '1px solid rgba(22, 119, 255, 0.2)'
                    : '1px solid rgba(140, 140, 140, 0.15)',
                }}
              >
                <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                  <Flex align="center" gap={8}>
                    <Avatar
                      size="small"
                      style={{ backgroundColor: msg.isStaff ? '#1677ff' : '#52c41a' }}
                    >
                      {msg.sender[0]}
                    </Avatar>
                    <Text strong>{msg.sender}</Text>
                    {msg.isStaff && (
                      <Tag color="blue" style={{ fontSize: 10 }}>
                        IT Staff
                      </Tag>
                    )}
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {msg.time}
                  </Text>
                </Flex>
                <Paragraph style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                  {msg.content}
                </Paragraph>
              </div>
            )}
          />

          {/* Reply Box */}
          <div style={{ marginTop: 20 }}>
            <Input.TextArea
              rows={3}
              placeholder="Write an IT response or resolution note to the requester..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <Flex justify="flex-end" gap={8}>
              <Button type="primary" icon={<SendOutlined />} onClick={handleSendReply}>
                Send Response
              </Button>
            </Flex>
          </div>
        </Drawer>
      )}
    </PageContainer>
  );
}
