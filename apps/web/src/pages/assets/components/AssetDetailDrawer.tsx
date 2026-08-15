import { EditOutlined, LaptopOutlined, QrcodeOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Descriptions, Drawer, Flex, QRCode, Tabs, Tag, Typography } from 'antd';
import React from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text, Title } = Typography;

export interface AssetDetailDrawerProps {
  open: boolean;
  selectedAsset: Asset | null;
  onClose: () => void;
  onOpenEditModal: (asset: Asset) => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = React.memo(
  ({ open, selectedAsset, onClose, onOpenEditModal }) => {
    if (!selectedAsset) return null;

    return (
      <Drawer
        title={
          <Flex align="center" gap={8}>
            <LaptopOutlined style={{ color: '#1677ff' }} />
            <span>{selectedAsset.name}</span>
            <Tag color="blue">{selectedAsset.tag}</Tag>
          </Flex>
        }
        size={540}
        open={open}
        onClose={onClose}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              onClose();
              onOpenEditModal(selectedAsset);
            }}
          >
            Edit Asset
          </Button>
        }
      >
        <Tabs
          defaultActiveKey="specs"
          items={[
            {
              key: 'specs',
              label: 'Specs & Overview',
              children: (
                <div>
                  <Descriptions
                    title="Hardware Identification"
                    bordered
                    size="small"
                    column={1}
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions.Item label="Asset Tag">{selectedAsset.tag}</Descriptions.Item>
                    <Descriptions.Item label="Serial Number">
                      {selectedAsset.serialNumber}
                    </Descriptions.Item>
                    <Descriptions.Item label="Manufacturer">
                      {selectedAsset.manufacturer}
                    </Descriptions.Item>
                    <Descriptions.Item label="Model">{selectedAsset.model}</Descriptions.Item>
                    <Descriptions.Item label="Category">{selectedAsset.category}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={selectedAsset.status === 'Active' ? 'success' : 'warning'}>
                        {selectedAsset.status}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions
                    title="Hardware Specifications"
                    bordered
                    size="small"
                    column={1}
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions.Item label="Processor">
                      {selectedAsset.specs?.cpu || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="RAM / Memory">
                      {selectedAsset.specs?.ram || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Storage Drive">
                      {selectedAsset.specs?.storage || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Operating System">
                      {selectedAsset.specs?.os || 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions title="Financial & Warranty" bordered size="small" column={1}>
                    <Descriptions.Item label="Purchase Date">
                      {selectedAsset.purchaseDate}
                    </Descriptions.Item>
                    <Descriptions.Item label="Purchase Cost">
                      ${(selectedAsset.purchasePrice || 0).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Warranty Expiration">
                      {selectedAsset.warrantyExpiry || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Current Location">
                      {selectedAsset.location}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            },
            {
              key: 'assignment',
              label: 'User Assignment',
              children: (
                <Card size="small">
                  <Flex align="center" gap={12} style={{ marginBottom: 16 }}>
                    <Avatar
                      size={40}
                      style={{ backgroundColor: '#1677ff' }}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <Title level={5} style={{ margin: 0 }}>
                        {selectedAsset.assignedTo}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {selectedAsset.assignedEmail || 'No corporate email linked'}
                      </Text>
                    </div>
                  </Flex>
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="Assigned Location">
                      {selectedAsset.location}
                    </Descriptions.Item>
                    <Descriptions.Item label="Assignment Date">
                      {selectedAsset.purchaseDate || 'Recent'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ),
            },
            {
              key: 'label',
              label: 'QR Barcode',
              children: (
                <Flex
                  vertical
                  align="center"
                  justify="center"
                  gap={14}
                  style={{ padding: '20px 0' }}
                >
                  <div
                    style={{
                      padding: 14,
                      border: '1px dashed #1677ff',
                      borderRadius: 8,
                      background: '#fff',
                      textAlign: 'center',
                    }}
                  >
                    <QRCode
                      value={`https://uims.internal/assets/${selectedAsset.tag}`}
                      size={150}
                    />
                    <div style={{ marginTop: 6, fontWeight: 700, fontSize: 15, color: '#000' }}>
                      {selectedAsset.tag}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>
                      {selectedAsset.serialNumber}
                    </div>
                  </div>
                  <Button icon={<QrcodeOutlined />} onClick={() => window.print()}>
                    Print Barcode Label
                  </Button>
                </Flex>
              ),
            },
          ]}
        />
      </Drawer>
    );
  },
);

AssetDetailDrawer.displayName = 'AssetDetailDrawer';
