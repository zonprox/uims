import { PrinterOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Segmented, Space, theme, Typography } from 'antd';
import React, { useState } from 'react';
import type { Asset } from '../../../services/assets.service';
import { PrintableAssetSheet } from './PrintableAssetSheet';

const { Text } = Typography;

export interface BatchPrintModalProps {
  open: boolean;
  assets: Asset[];
  onClose: () => void;
}

export const BatchPrintModal: React.FC<BatchPrintModalProps> = React.memo(
  ({ open, assets, onClose }) => {
    const { token } = theme.useToken();
    const [columns, setColumns] = useState<3 | 4>(3);

    const handlePrint = () => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    };

    return (
      <Modal
        title={
          <Flex align="center" justify="space-between" style={{ paddingRight: 24 }}>
            <span>
              Batch Print QR Labels ({assets.length} Selected)
            </span>
          </Flex>
        }
        open={open}
        onCancel={onClose}
        width={880}
        destroyOnHidden
        styles={{
          body: {
            padding: '16px 0',
          },
        }}
        footer={
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Flex align="center" gap={8}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Layout Density:
              </Text>
              <Segmented<3 | 4>
                value={columns}
                onChange={(val) => setColumns(val as 3 | 4)}
                options={[
                  { label: '3 Columns (Standard)', value: 3 },
                  { label: '4 Columns (Compact)', value: 4 },
                ]}
              />
            </Flex>
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
          <PrintableAssetSheet assets={assets} columns={columns} />
        </div>
      </Modal>
    );
  },
);

BatchPrintModal.displayName = 'BatchPrintModal';
