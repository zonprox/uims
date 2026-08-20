import { ApiOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

export interface PingToolModalProps {
  open: boolean;
  pinging: boolean;
  pingResult: { ip: string; message: string } | null;
  onClose: () => void;
}

export const PingToolModal: React.FC<PingToolModalProps> = React.memo(
  ({ open, pinging, pingResult, onClose }) => (
    <Modal
      title="Ping Host"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={480}
    >
      <div style={{ padding: '12px 0' }}>
        {pinging ? (
          <Flex justify="center" align="center" gap={12} style={{ padding: '24px 0' }}>
            <ApiOutlined spin style={{ fontSize: 24, color: '#1677ff' }} />
            <Text>Transmitting ping requests...</Text>
          </Flex>
        ) : (
          <div>
            <div
              style={{
                background: '#090d16',
                color: '#10b981',
                padding: 14,
                borderRadius: 6,
                fontFamily: 'monospace',
                fontSize: 12.5,
                lineHeight: 1.6,
              }}
            >
              <div>PING {pingResult?.ip} (56 data bytes)</div>
              <div>{pingResult?.message}</div>
              <div style={{ color: '#94a3b8', marginTop: 6 }}>
                --- {pingResult?.ip} ping statistics ---
                <br />4 packets transmitted, 4 received, 0% packet loss, rtt min/avg/max =
                1.1/1.4/1.8 ms
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  ),
);

PingToolModal.displayName = 'PingToolModal';
