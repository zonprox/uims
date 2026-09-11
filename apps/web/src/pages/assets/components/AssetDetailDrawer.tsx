import { EditOutlined, LaptopOutlined, PrinterOutlined, UserOutlined } from '@ant-design/icons';
import {
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Drawer,
  Flex,
  QRCode,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import React, { useMemo, useRef } from 'react';
import { FormattedDate } from '../../../components/FormattedDate';
import type { Asset } from '../../../services/assets.service';
import { printAssetLabel } from '../utils/printAssetLabel';

const { Text, Title } = Typography;

declare module '../../../services/assets.service' {
  interface Asset {
    locationPath?: string | null;
  }
}

export interface AssetDetailDrawerProps {
  open: boolean;
  selectedAsset: Asset | null;
  onClose: () => void;
  onOpenEditModal: (asset: Asset) => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = React.memo(
  ({ open, selectedAsset, onClose, onOpenEditModal }) => {
    if (!selectedAsset) return null;
    const { token } = theme.useToken();
    const qrContainerRef = useRef<HTMLDivElement>(null);

    const locationSegments = useMemo(() => {
      const fullPath = selectedAsset.locationPath || selectedAsset.location || '';
      if (!fullPath) return [];
      return fullPath
        .split(' > ')
        .map((segment) => segment.trim())
        .filter(Boolean);
    }, [selectedAsset.location, selectedAsset.locationPath]);

    const renderLocationBreadcrumb = () => {
      if (locationSegments.length === 0) {
        return <Text type="secondary">Unassigned</Text>;
      }
      return (
        <Breadcrumb
          items={locationSegments.map((segment) => ({
            title: segment,
          }))}
        />
      );
    };

    const renderDepartment = () => {
      if (!selectedAsset.department) {
        return <Text type="secondary">Unassigned</Text>;
      }
      return <Tag color="cyan">{selectedAsset.department}</Tag>;
    };

    return (
      <Drawer
        title={
          <Flex align="center" gap={8}>
            <LaptopOutlined style={{ color: token.colorPrimary }} />
            <span>{selectedAsset.name}</span>
            <Tag color="blue">{selectedAsset.tag}</Tag>
          </Flex>
        }
        open={open}
        onClose={onClose}
        destroyOnHidden
        size={540}
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
              label: 'Specifications',
              children: (
                <div>
                  <Descriptions
                    title="Asset Information"
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
                    <Descriptions.Item label="Owner Department">
                      {renderDepartment()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={selectedAsset.status === 'Active' ? 'success' : 'warning'}>
                        {selectedAsset.status}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions
                    title="Technical Specifications"
                    bordered
                    size="small"
                    column={1}
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions.Item label="Processor (CPU)">
                      {selectedAsset.specs?.cpu || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Memory (RAM)">
                      {selectedAsset.specs?.ram || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Storage">
                      {selectedAsset.specs?.storage || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Operating System">
                      {selectedAsset.specs?.os || 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions title="Financial & Warranty" bordered size="small" column={1}>
                    <Descriptions.Item label="Purchase Date">
                      <FormattedDate date={selectedAsset.purchaseDate} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Purchase Price">
                      ${(selectedAsset.purchasePrice || 0).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Warranty Expiration">
                      <FormattedDate date={selectedAsset.warrantyExpiry} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Physical Location">
                      {renderLocationBreadcrumb()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Owner Department">
                      {renderDepartment()}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            },
            {
              key: 'assignment',
              label: 'Assignment',
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
                        {selectedAsset.assignedEmail || 'No corporate email assigned'}
                      </Text>
                    </div>
                  </Flex>
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="Owner Department">
                      {renderDepartment()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Assigned Location">
                      {renderLocationBreadcrumb()}
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
              label: 'QR Code',
              children: (
                <Flex
                  vertical
                  align="center"
                  justify="center"
                  gap={16}
                  style={{ padding: '20px 0' }}
                >
                  <div
                    ref={qrContainerRef}
                    className="printable-asset-label"
                    style={{
                      padding: token.paddingLG,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius: token.borderRadiusLG,
                      backgroundColor: token.colorFillAlter,
                      textAlign: 'center',
                      maxWidth: 280,
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Flex justify="center" align="center" style={{ marginBottom: 12 }}>
                      <QRCode
                        value={selectedAsset.tag}
                        size={160}
                        bordered={false}
                        color={token.colorText}
                        bgColor="transparent"
                      />
                    </Flex>
                    <Text strong style={{ fontSize: 16, display: 'block' }}>
                      {selectedAsset.tag}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                      {selectedAsset.name}
                    </Text>
                    {selectedAsset.serialNumber && (
                      <Text code style={{ fontSize: 11, display: 'inline-block', marginTop: 6 }}>
                        {selectedAsset.serialNumber}
                      </Text>
                    )}
                  </div>
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={() => printAssetLabel(selectedAsset, qrContainerRef.current)}
                  >
                    Print QR Label
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
