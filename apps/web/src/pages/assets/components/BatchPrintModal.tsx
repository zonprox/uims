import { PrinterOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Segmented, Space, Tag, theme } from 'antd';
import React, { useRef, useState } from 'react';
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
  ({ open, assets, onClose, defaultColumns = 3 }) => {
    const { token } = theme.useToken();
    const sheetRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState<number>(defaultColumns);

    const handlePrint = () => {
      printBatchAssetSheet(sheetRef.current, columns);
    };

    return (
      <Modal
        className="batch-print-modal"
        title={
          <Flex align="center" justify="space-between" style={{ paddingRight: 24 }}>
            <span>Batch Print QR Labels ({assets.length} Selected)</span>
            <Flex align="center" gap={8}>
              <Tag color="blue">Standard 4-Column A4 Layout</Tag>
              <span style={{ fontSize: 12 }}>Layout Density:</span>
              <Segmented
                size="small"
                value={columns}
                onChange={(val) => setColumns(Number(val))}
                options={[
                  { label: '3 Columns (Standard)', value: 3 },
                  { label: '4 Columns (Compact)', value: 4 },
                ]}
              />
            </Flex>
          </Flex>
        }
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
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
              Standardized format: {columns} labels per row (A4 Sheet Decal)
            </span>
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
            <PrintableAssetSheet assets={assets} columns={columns} />
          </div>
        </div>
      </Modal>
    );
  },
);

BatchPrintModal.displayName = 'BatchPrintModal';
