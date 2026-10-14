import { PrinterOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Space, theme } from 'antd';
import React, { useRef } from 'react';
import type { Asset } from '../../../services/assets.service';
import { printBatchAssetSheet } from '../utils/printAssetLabel';
import { PrintableAssetSheet } from './PrintableAssetSheet';

export interface BatchPrintModalProps {
  open: boolean;
  assets: Asset[];
  onClose: () => void;
  defaultColumns?: number;
}

export const BatchPrintModal: React.FC<BatchPrintModalProps> = React.memo(
  ({ open, assets, onClose }) => {
    const { token } = theme.useToken();
    const sheetRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
      printBatchAssetSheet(sheetRef.current, 4);
    };

    return (
      <Modal
        className="batch-print-modal"
        title={`Batch Print QR Labels (${assets.length} Selected)`}
        open={open}
        onCancel={onClose}
        width={920}
        destroyOnHidden
        styles={{
          body: {
            padding: '16px 0',
          },
        }}
        footer={
          <Flex justify="flex-end" align="center" style={{ width: '100%' }}>
            <Space size={8}>
              <Button onClick={onClose}>Close</Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                disabled={assets.length === 0}
                onClick={handlePrint}
              >
                Print Sheet
              </Button>
            </Space>
          </Flex>
        }
      >
        <div
          className="printable-viewport"
          style={{
            maxHeight: '65vh',
            overflowY: 'auto',
            padding: '16px',
            background: token.colorFillAlter,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div ref={sheetRef}>
            <PrintableAssetSheet assets={assets} />
          </div>
        </div>
      </Modal>
    );
  },
);

BatchPrintModal.displayName = 'BatchPrintModal';
