import { PrinterOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, theme } from 'antd';
import React, { useRef } from 'react';
import type { Asset } from '../../../services/assets.service';
import { printAssetLabel } from '../utils/printAssetLabel';
import { PrintableAssetLabel } from './PrintableAssetLabel';

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
        destroyOnHidden={true}
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
          <PrintableAssetLabel asset={qrAsset} containerRef={labelContainerRef} />
        </Flex>
      </Modal>
    );
  },
);

AssetQrModal.displayName = 'AssetQrModal';
