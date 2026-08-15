import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  TableOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
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
  Modal,
  Row,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import {
  type Ticket,
  type TicketMessage,
  type TicketStats,
  ticketsService,
} from '../../services/tickets.service';
import { useAuthStore } from '../../stores/auth.store';

const { Text, Title } = Typography;
const { Option } = Select;

export default function TicketsPage() {
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);

  const [tickets, setTickets] = useState<Array<Ticket>>([]);
  const [stats, setStats] = useState<TicketStats>({
    openIncidentQueue: 0,
    inProgress: 0,
    urgentIncidents: 0,
    slaComplianceRate: '98.2%',
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        ticketsService.getTickets({
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        ticketsService.getStats().catch(() => null),
      ]);
      setTickets(list);
      if (statsData) {
        setStats(statsData);
      } else {
        setStats({
          openIncidentQueue: list.filter((t) => t.status === 'Open').length,
          inProgress: list.filter((t) => t.status === 'In Progress').length,
          urgentIncidents: list.filter((t) => t.priority === 'Urgent' && t.status !== 'Closed')
            .length,
          slaComplianceRate: '98.2%',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load helpdesk tickets.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, message, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      priority: 'Medium',
      category: 'Hardware',
      requesterName: user?.name || 'Marcus Vance',
      requesterEmail: user?.email || 'marcus.vance@company.com',
    });
    setModalOpen(true);
  };

  const handleCreateTicket = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      const created = await ticketsService.createTicket({
        title: values.title,
        category: values.category,
        priority: values.priority,
        requesterName: values.requesterName,
        requesterEmail: values.requesterEmail,
        description: values.description,
        affectedAsset: values.affectedAsset,
      });

      message.success(`Ticket ${created.id} submitted successfully.`);
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to create support ticket.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenDrawer = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;
    setSendingReply(true);

    try {
      const targetId = selectedTicket.realId || selectedTicket.id;
      await ticketsService.addComment(targetId, {
        content: replyContent,
        sender: user?.name || 'IT Support Staff',
        isStaff: true,
        avatarColor: '#1677ff',
      });

      message.success('Response added to ticket thread.');
      setReplyContent('');

      // Refresh current ticket
      const freshTicket = await ticketsService.getTicket(targetId);
      setSelectedTicket(freshTicket);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to post reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const targetId = selectedTicket.realId || selectedTicket.id;
      const updated = await ticketsService.updateStatus(targetId, status);
      setSelectedTicket(updated);
      message.success(`Ticket status updated to ${status}.`);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to update status.');
    }
  };

  const columns = [
    {
      title: 'Ticket ID & Title',
      key: 'title',
      render: (_: unknown, record: Ticket) => (
        <div>
          <Flex align="center" gap={8}>
            <Text code strong style={{ fontSize: 12.5, color: '#1677ff' }}>
              {record.id}
            </Text>
            <Tag color="geekblue" style={{ fontSize: 11 }}>
              {record.category}
            </Tag>
          </Flex>
          <Text
            strong
            style={{ fontSize: 13, display: 'block', marginTop: 3, cursor: 'pointer' }}
            onClick={() => handleOpenDrawer(record)}
          >
            {record.title}
          </Text>
        </div>
      ),
    },
    {
      title: 'Requester',
      dataIndex: 'requesterName',
      key: 'requesterName',
      render: (name: string, record: Ticket) => (
        <Flex align="center" gap={8}>
          <Avatar size="small" style={{ backgroundColor: '#1890ff', fontSize: 11 }}>
            {name ? name[0] : 'U'}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 12.5, display: 'block' }}>
              {name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.requesterEmail}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: Ticket['priority']) => {
        let color = 'default';
        if (priority === 'Urgent') color = 'error';
        if (priority === 'High') color = 'warning';
        if (priority === 'Medium') color = 'processing';
        return <Tag color={color}>{priority}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Ticket['status']) => {
        let color = 'default';
        if (status === 'Open') color = 'warning';
        if (status === 'In Progress') color = 'processing';
        if (status === 'Resolved') color = 'success';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Assigned Engineer',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      render: (assignee: string) => (
        <Text style={{ fontSize: 12.5 }}>{assignee || 'Unassigned Queue'}</Text>
      ),
    },
    {
      title: 'SLA Timer',
      dataIndex: 'slaRemaining',
      key: 'slaRemaining',
      render: (sla: string) => (
        <Flex align="center" gap={4}>
          <ClockCircleOutlined style={{ color: '#faad14', fontSize: 13 }} />
          <Text style={{ fontSize: 11.5 }}>{sla}</Text>
        </Flex>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Ticket) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<CommentOutlined />}
          onClick={() => handleOpenDrawer(record)}
        >
          Reply ({record.messages?.length || 0})
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="IT Helpdesk & Incident Management"
      subtitle="Track employee support requests, hardware RMA tickets, SLA timers, and conversation streams."
      breadcrumbs={[{ title: 'Tickets' }]}
      stats={[
        {
          title: 'Open Incident Queue',
          value: stats.openIncidentQueue,
          prefix: <CustomerServiceOutlined />,
          color: '#1677ff',
        },
        {
          title: 'In Progress / Assigned',
          value: stats.inProgress,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Urgent Severity Incidents',
          value: stats.urgentIncidents,
          prefix: <WarningOutlined />,
          color: stats.urgentIncidents > 0 ? '#ef4444' : '#94a3b8',
        },
        {
          title: 'Global SLA Met Rate',
          value: stats.slaComplianceRate,
          prefix: <ClockCircleOutlined />,
          color: '#6366f1',
        },
      ]}
      extra={
        <Flex gap={8} align="center">
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Segmented
            options={[
              { value: 'table', icon: <TableOutlined /> },
              { value: 'kanban', icon: <AppstoreOutlined /> },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as 'table' | 'kanban')}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Open Ticket
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        {/* Search & Filter Toolbar */}
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search by ticket ID, title, requester..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 150 }}
                placeholder="Category"
              >
                <Option value="all">All Categories</Option>
                <Option value="Hardware">Hardware</Option>
                <Option value="Software">Software</Option>
                <Option value="Network">Network</Option>
                <Option value="Access & SSO">Access & SSO</Option>
                <Option value="Email">Email</Option>
              </Select>

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 140 }}
                placeholder="Status"
              >
                <Option value="all">All Status</Option>
                <Option value="open">Open</Option>
                <Option value="in_progress">In Progress</Option>
                <Option value="resolved">Resolved</Option>
              </Select>

              {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </Flex>
          </Col>
        </Row>

        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={tickets}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} tickets` }}
          />
        ) : (
          /* Kanban Board View */
          <Row gutter={[14, 14]}>
            {['Open', 'In Progress', 'Resolved'].map((colStatus) => {
              const colTickets = tickets.filter((t) => t.status === colStatus);
              return (
                <Col xs={24} md={8} key={colStatus}>
                  <div
                    style={{
                      background: 'rgba(140, 140, 140, 0.06)',
                      padding: 12,
                      borderRadius: 8,
                      minHeight: 400,
                    }}
                  >
                    <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                      <Text strong style={{ fontSize: 13.5 }}>
                        {colStatus}
                      </Text>
                      <Badge count={colTickets.length} style={{ backgroundColor: '#1677ff' }} />
                    </Flex>

                    <Flex vertical gap={10}>
                      {colTickets.map((ticket) => (
                        <Card
                          key={ticket.id}
                          size="small"
                          hoverable
                          onClick={() => handleOpenDrawer(ticket)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Flex justify="space-between" align="flex-start">
                            <Text code strong style={{ color: '#1677ff' }}>
                              {ticket.id}
                            </Text>
                            <Tag
                              color={ticket.priority === 'Urgent' ? 'error' : 'blue'}
                              style={{ margin: 0 }}
                            >
                              {ticket.priority}
                            </Tag>
                          </Flex>
                          <Text
                            strong
                            style={{ fontSize: 13, display: 'block', margin: '6px 0 4px 0' }}
                          >
                            {ticket.title}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>
                            {ticket.requesterName}
                          </Text>
                        </Card>
                      ))}
                    </Flex>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* Open Ticket Modal */}
      <Modal
        title="Open IT Support Ticket"
        open={modalOpen}
        onOk={handleCreateTicket}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={600}
        okText="Submit Ticket"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Form.Item label="Ticket Summary" name="title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Cannot connect to NYC-GW01 VPN" />
          </Form.Item>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select>
                  <Option value="Hardware">Hardware Issue</Option>
                  <Option value="Software">Software & SaaS</Option>
                  <Option value="Network">VPN & Wi-Fi Network</Option>
                  <Option value="Access & SSO">Access, MFA & Password</Option>
                  <Option value="Email">Email & Mailboxes</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priority Severity" name="priority" rules={[{ required: true }]}>
                <Select>
                  <Option value="Urgent">Urgent (SLA: 2h)</Option>
                  <Option value="High">High (SLA: 4h)</Option>
                  <Option value="Medium">Medium (SLA: 24h)</Option>
                  <Option value="Low">Low (SLA: 48h)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
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

          <Form.Item label="Affected Asset Tag (Optional)" name="affectedAsset">
            <Input placeholder="e.g. AST-1024 (MacBook Pro 16)" />
          </Form.Item>

          <Form.Item label="Detailed Description" name="description" rules={[{ required: true }]}>
            <Input.TextArea
              rows={3}
              placeholder="Please describe exact error messages, reproduction steps..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Ticket Conversation & Triage Drawer */}
      {selectedTicket && (
        <Drawer
          title={
            <div>
              <Flex align="center" gap={8}>
                <Text code strong style={{ color: '#1677ff', fontSize: 13 }}>
                  {selectedTicket.id}
                </Text>
                <Tag color={selectedTicket.priority === 'Urgent' ? 'error' : 'blue'}>
                  {selectedTicket.priority}
                </Tag>
                <Tag color={selectedTicket.status === 'Resolved' ? 'success' : 'processing'}>
                  {selectedTicket.status}
                </Tag>
              </Flex>
              <Title level={5} style={{ margin: '4px 0 0 0', fontSize: 14 }}>
                {selectedTicket.title}
              </Title>
            </div>
          }
          size={520}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          extra={
            <Select
              size="small"
              value={selectedTicket.status}
              onChange={handleUpdateStatus}
              style={{ width: 130 }}
            >
              <Option value="Open">Open</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Resolved">Resolved</Option>
              <Option value="Closed">Closed</Option>
            </Select>
          }
        >
          <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Requester">
              {selectedTicket.requesterName} ({selectedTicket.requesterEmail})
            </Descriptions.Item>
            <Descriptions.Item label="Category">{selectedTicket.category}</Descriptions.Item>
            <Descriptions.Item label="Assigned Specialist">
              {selectedTicket.assignee}
            </Descriptions.Item>
            {selectedTicket.affectedAsset && (
              <Descriptions.Item label="Affected Device">
                {selectedTicket.affectedAsset}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="SLA Window">{selectedTicket.slaDeadline}</Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '14px 0', fontSize: 13 }}>Conversation History</Divider>

          <Flex vertical gap={10}>
            {(selectedTicket.messages || []).map((msg: TicketMessage) => (
              <div key={msg.id} style={{ padding: '4px 0' }}>
                <Flex gap={10} style={{ width: '100%' }}>
                  <Avatar
                    size="small"
                    style={{
                      backgroundColor: msg.avatarColor || (msg.isStaff ? '#1677ff' : '#10b981'),
                    }}
                  >
                    {msg.sender ? msg.sender[0] : 'U'}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Flex justify="space-between" align="center">
                      <Flex gap={6} align="center">
                        <Text strong style={{ fontSize: 12.5 }}>
                          {msg.sender}
                        </Text>
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
                    <div
                      style={{
                        marginTop: 4,
                        padding: 10,
                        borderRadius: 6,
                        background: msg.isStaff
                          ? 'rgba(22, 119, 255, 0.06)'
                          : 'rgba(140, 140, 140, 0.08)',
                        fontSize: 12.5,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </Flex>
              </div>
            ))}
          </Flex>

          <div style={{ marginTop: 16 }}>
            <Input.TextArea
              rows={3}
              placeholder="Write a message or reply to requester..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sendingReply}
              onClick={handleSendReply}
              style={{ marginTop: 8 }}
              block
            >
              Post Staff Reply
            </Button>
          </div>
        </Drawer>
      )}
    </PageContainer>
  );
}
