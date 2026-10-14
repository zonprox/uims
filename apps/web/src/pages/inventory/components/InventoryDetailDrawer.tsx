import { BankOutlined, EditOutlined, InboxOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Button, Descriptions, Flex, Tabs, Tag, Typography, theme } from 'antd';
import React from 'react';
import ActivityTimeline from '../../../components/ActivityTimeline';
import AppDrawer from '../../../components/AppDrawer';
import type { InventoryItem } from '../../../services/inventory.service';

const { Text } = Typography;

export interface InventoryDetailDrawerProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onEdit?: (item: InventoryItem) => void;
  onRestock?: (item: InventoryItem) => void;
}

export const InventoryDetailDrawer: React.FC<InventoryDetailDrawerProps> = React.memo(
  ({ open, item, onClose, onEdit, onRestock }) => {
    const { token } = theme.useToken();
    if (!item) return null;

    const isOutOfStock = item.quantity === 0;
    const isLowStock = !isOutOfStock && item.quantity <= item.minThreshold;
    const categoryName =
      typeof item.category === 'string' ? item.category : item.category?.name || 'General';
    const vendorDisplay = item.vendor?.name || item.supplier;
    const totalValuation = item.quantity * item.unitCost;

    return (
      <AppDrawer
        title={item.name}
        subtitle={`SKU: ${item.sku} — ${categoryName}`}
        icon={<InboxOutlined style={{ fontSize: 18, color: token.colorPrimary }} />}
        tag={
          isOutOfStock ? (
            <Tag color="error">Out of Stock</Tag>
          ) : isLowStock ? (
            <Tag color="warning">Low Stock</Tag>
          ) : (
            <Tag color="success">In Stock</Tag>
          )
        }
        open={open}
        onClose={onClose}
        size={580}
        extra={
          <Flex align="center" gap={8}>
            {onRestock && (
              <Button
                type="primary"
                size="small"
                icon={<ShoppingOutlined />}
                onClick={() => {
                  onRestock(item);
                  onClose();
                }}
              >
                Restock
              </Button>
            )}
            {onEdit && (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  onEdit(item);
                  onClose();
                }}
              >
                Edit
              </Button>
            )}
          </Flex>
        }
        cancelText="Close"
      >
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: 'Item Overview',
              children: (
                <div>
                  <Descriptions
                    title="Product Specifications"
                    bordered
                    size="small"
                    column={1}
                    styles={{ label: { whiteSpace: 'nowrap' } }}
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions.Item label="SKU">
                      <Text code strong style={{ color: token.colorPrimary }}>
                        {item.sku}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Item Name">
                      <Text strong>{item.name}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Category">
                      <Tag color="geekblue">{categoryName}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Storage Bin">
                      {item.binNumber ? (
                        <Tag color="cyan">{item.binNumber}</Tag>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Descriptions.Item>
                    {item.organization && (
                      <Descriptions.Item label="Organization">
                        <Tag color="purple" icon={<BankOutlined />}>
                          {item.organization}
                        </Tag>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Supplier / Vendor">
                      {vendorDisplay || <Text type="secondary">—</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Notes">
                      {item.notes ? (
                        <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {item.notes}
                        </Text>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions
                    title="Stock Levels & Valuation"
                    bordered
                    size="small"
                    column={1}
                    styles={{ label: { whiteSpace: 'nowrap' } }}
                  >
                    <Descriptions.Item label="Current Stock">
                      <Flex align="center" gap={8}>
                        <Text strong style={{ fontSize: 14 }}>
                          {item.quantity} units
                        </Text>
                        {isOutOfStock ? (
                          <Tag color="error">Depleted</Tag>
                        ) : isLowStock ? (
                          <Tag color="warning">Below Minimum ({item.minThreshold})</Tag>
                        ) : (
                          <Tag color="success">Healthy</Tag>
                        )}
                      </Flex>
                    </Descriptions.Item>
                    <Descriptions.Item label="Min Reorder Threshold">
                      {item.minThreshold} units
                    </Descriptions.Item>
                    <Descriptions.Item label="Unit Cost">
                      ${item.unitCost.toFixed(2)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Valuation">
                      <Text strong style={{ fontSize: 13 }}>
                        $
                        {totalValuation.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            },
            {
              key: 'history',
              label: 'Stock & Item Movement History',
              children: <ActivityTimeline entityType="Inventory" entityId={item.id} />,
            },
          ]}
        />
      </AppDrawer>
    );
  },
);

InventoryDetailDrawer.displayName = 'InventoryDetailDrawer';
export default InventoryDetailDrawer;
