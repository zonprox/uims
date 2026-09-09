import { PrinterOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, QRCode, Typography, theme } from 'antd';
import React, { useRef } from 'react';
import type { Asset } from '../../../services/assets.service';
import { printAssetLabel } from '../utils/printAssetLabel';

const { Text } = Typography;

export interface AssetQrModalProps {
  open: boolean;
  qrAsset: Asset | null;
  onClose: () => void;
}

export const AssetQrModal: React.FC<AssetQrModalProps> = React.memo(
  ({ open, qrAsset, onClose }) => {
    if (!qrAsset) return null;
    const { token } = theme.useToken();
    const labelContainerRef = useRef<HTMLDivElement>(null);

    return (
      <Modal
        title={`Asset Tag Label: ${qrAsset.tag}`}
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => printAssetLabel(qrAsset, labelContainerRef.current)}
          >
            Print QR Label
          </Button>,
        ]}
        width={360}
        centered
        styles={{
          body: {
            padding: `${token.paddingMD}px 0`,
          },
        }}
      >
        <Flex vertical align="center" justify="center" gap={12}>
          <div
            ref={labelContainerRef}
            className="printable-asset-label"
            style={{
              padding: token.paddingLG,
              backgroundColor: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              textAlign: 'center',
              width: '100%',
              maxWidth: 280,
              boxSizing: 'border-box',
            }}
          >
            <Flex justify="center" align="center" style={{ marginBottom: 12 }}>
              <QRCode
                value={`https://uims.internal/assets/${qrAsset.tag}`}
                size={160}
                bordered={false}
                color={token.colorText}
                bgColor="transparent"
              />
            </Flex>
            <Text strong style={{ fontSize: 16, display: 'block' }}>
              {qrAsset.tag}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
              {qrAsset.name}
            </Text>
            {qrAsset.serialNumber && (
              <Text code style={{ fontSize: 11, display: 'inline-block', marginTop: 6 }}>
                {qrAsset.serialNumber}
              </Text>
            )}
          </div>
        </Flex>
      </Modal>
    );
  },
);

AssetQrModal.displayName = 'AssetQrModal';
