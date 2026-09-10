import {
  CopyOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Flex,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import type { RevealedCredentialResult } from '../../../services/network.service';

const { Text, Title } = Typography;

export interface CredentialRevealModalProps {
  open: boolean;
  targetIp: string | null;
  credential: RevealedCredentialResult | null;
  loading: boolean;
  onClose: () => void;
}

export const CredentialRevealModal: React.FC<CredentialRevealModalProps> = React.memo(
  ({ open, targetIp, credential, loading, onClose }) => {
    const { message } = App.useApp();
    const [showPassword, setShowPassword] = useState(false);

    const handleCopy = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      message.success(`${label} copied to clipboard.`);
    };

    return (
      <Modal
        title={
          <Flex align="center" gap={8}>
            <SafetyCertificateOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Decrypted Administrative Credentials
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Device IP: {targetIp}
              </Text>
            </div>
          </Flex>
        }
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" type="primary" onClick={onClose}>
            Done
          </Button>,
        ]}
        width={540}
        styles={{ body: { paddingTop: 14 } }}
      >
        <Alert
          type="warning"
          showIcon
          icon={<KeyOutlined />}
          title="Audited Security Operation"
          description="Decryption event has been recorded in the immutable audit log with your account signature."
          style={{ marginBottom: 16 }}
        />

        {credential ? (
          <Card size="small" styles={{ body: { padding: '16px' } }}>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Credential Profile">
                <Text strong>{credential.name || 'Device Admin Access'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Protocol / Port">
                <Flex align="center" gap={6}>
                  <Tag color="blue">{credential.protocol || 'SSH / Web GUI'}</Tag>
                  {credential.port && <Tag>Port {credential.port}</Tag>}
                </Flex>
              </Descriptions.Item>
              <Descriptions.Item label="Username">
                <Flex justify="space-between" align="center">
                  <Text code copyable={{ text: credential.username }}>
                    {credential.username}
                  </Text>
                </Flex>
              </Descriptions.Item>
              <Descriptions.Item label="Password">
                <Flex justify="space-between" align="center" gap={8}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={credential.password || '••••••••••••'}
                    readOnly
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                  <Space>
                    <Button
                      size="small"
                      icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </Button>
                    {credential.password && (
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(credential.password!, 'Password')}
                      >
                        Copy
                      </Button>
                    )}
                  </Space>
                </Flex>
              </Descriptions.Item>
              {credential.notes && (
                <Descriptions.Item label="Notes">
                  <Text type="secondary">{credential.notes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type="secondary">
              {loading
                ? 'Retrieving and decrypting AES-256-GCM hardware credentials...'
                : 'No encrypted administrative credential bound to this IP address.'}
            </Text>
          </div>
        )}
      </Modal>
    );
  },
);

CredentialRevealModal.displayName = 'CredentialRevealModal';
