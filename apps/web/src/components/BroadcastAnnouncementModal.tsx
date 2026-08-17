import {
  AlertOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  NotificationOutlined,
  SendOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import { type BroadcastPayload, notificationsService } from '../services/notifications.service';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface BroadcastAnnouncementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BroadcastAnnouncementModal: React.FC<BroadcastAnnouncementModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm<BroadcastPayload>();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  const previewValues = Form.useWatch([], form);

  const handleSubmit = async (values: BroadcastPayload) => {
    try {
      setSubmitting(true);
      const res = await notificationsService.broadcastAnnouncement(values);
      message.success(`Announcement broadcasted successfully to ${res.count} active users.`);
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      message.error('Failed to broadcast announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentType = previewValues?.type || 'INFO';
  const currentTitle = previewValues?.title || 'System Maintenance Window Notice';
  const currentMessage =
    previewValues?.message ||
    'Scheduled database optimization and cache indexing will take place tonight at 02:00 UTC.';

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WARNING':
        return <WarningOutlined style={{ color: '#f59e0b', fontSize: 16 }} />;
      case 'ALERT':
        return <AlertOutlined style={{ color: '#ef4444', fontSize: 16 }} />;
      case 'SUCCESS':
        return <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 16 }} />;
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Flex align="center" gap={8}>
          <NotificationOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <Title level={5} style={{ margin: 0, fontSize: 15 }}>
            Broadcast System Announcement
          </Title>
        </Flex>
      }
      footer={null}
      width={560}
      destroyOnClose
    >
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12.5, display: 'block', marginBottom: 16 }}>
          Publish an instantaneous real-time notification to all active browser sessions via
          WebSocket.
        </Text>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'INFO',
            targetRole: 'All',
            title: '',
            message: '',
            link: '',
          }}
          onFinish={handleSubmit}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Announcement Severity" name="type" rules={[{ required: true }]}>
                <Select size="middle">
                  <Option value="INFO">
                    <Space size={6}>
                      <InfoCircleOutlined style={{ color: '#1677ff' }} />
                      <span>Information (Blue)</span>
                    </Space>
                  </Option>
                  <Option value="WARNING">
                    <Space size={6}>
                      <WarningOutlined style={{ color: '#f59e0b' }} />
                      <span>Warning (Amber)</span>
                    </Space>
                  </Option>
                  <Option value="ALERT">
                    <Space size={6}>
                      <AlertOutlined style={{ color: '#ef4444' }} />
                      <span>Critical Alert (Red)</span>
                    </Space>
                  </Option>
                  <Option value="SUCCESS">
                    <Space size={6}>
                      <CheckCircleOutlined style={{ color: '#10b981' }} />
                      <span>Success (Green)</span>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Target Audience" name="targetRole" rules={[{ required: true }]}>
                <Select size="middle">
                  <Option value="All">All Organization Users</Option>
                  <Option value="Super Admin">Super Admins Only</Option>
                  <Option value="Admin">Administrators Only</Option>
                  <Option value="Employee">Standard Employees</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Announcement Headline"
            name="title"
            rules={[
              { required: true, message: 'Headline is required' },
              { max: 100, message: 'Max 100 characters' },
            ]}
          >
            <Input placeholder="e.g. Scheduled Infrastructure Maintenance Window" />
          </Form.Item>

          <Form.Item
            label="Message Body"
            name="message"
            rules={[
              { required: true, message: 'Message body is required' },
              { max: 500, message: 'Max 500 characters' },
            ]}
          >
            <TextArea
              rows={3}
              placeholder="Describe the system event, instructions, or policy update..."
            />
          </Form.Item>

          <Form.Item
            label="Optional Direct Navigation Route"
            name="link"
            tooltip="User clicking the notification will be immediately redirected to this page"
          >
            <Input placeholder="e.g. /settings, /inventory, /licenses" />
          </Form.Item>

          {/* Live Preview Card */}
          <div style={{ marginBottom: 20 }}>
            <Text
              strong
              style={{
                fontSize: 11.5,
                textTransform: 'uppercase',
                color: '#64748b',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Real-time Toast & Drawer Preview
            </Text>
            <Card
              size="small"
              style={{
                borderRadius: 6,
                background: 'rgba(22, 119, 255, 0.04)',
                border: '1px solid rgba(22, 119, 255, 0.18)',
              }}
              styles={{ body: { padding: '10px 14px' } }}
            >
              <Flex gap={12} align="flex-start">
                <div style={{ marginTop: 2 }}>{getTypeIcon(currentType)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {currentTitle || 'Announcement Headline'}
                    </Text>
                    <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                      Just now
                    </Tag>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {currentMessage || 'Announcement details will appear here.'}
                  </Text>
                </div>
              </Flex>
            </Card>
          </div>

          <Flex justify="flex-end" gap={8}>
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={submitting}
              style={{ fontWeight: 600 }}
            >
              Broadcast Now
            </Button>
          </Flex>
        </Form>
      </div>
    </Modal>
  );
};
