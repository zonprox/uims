import { Button, Flex, Modal, QRCode, Typography } from 'antd';
import React from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface AssetQrModalProps {
  open: boolean;
  qrAsset: Asset | null;
  onClose: () => void;
}

export const AssetQrModal: React.FC<AssetQrModalProps> = React.memo(
  ({ open, qrAsset, onClose }) => {
    if (!qrAsset) return null;

    return (
      <Modal
        title={`Asset Tag Label: ${qrAsset.tag}`}
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          <Button key="print" type="primary" onClick={() => window.print()}>
            Print QR Label
          </Button>,
        ]}
        width={360}
        centered
      >
        <Flex vertical align="center" justify="center" gap={10} style={{ padding: '16px 0' }}>
          <QRCode value={`https://uims.internal/assets/${qrAsset.tag}`} size={160} />
          <Text strong style={{ fontSize: 16 }}>
            {qrAsset.tag}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {qrAsset.name}
          </Text>
          <Text code>{qrAsset.serialNumber}</Text>
        </Flex>
      </Modal>
    );
  },
);

AssetQrModal.displayName = 'AssetQrModal';
