import {
  AppstoreOutlined,
  EditOutlined,
  PlusCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Progress,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React from 'react';
import ActivityTimeline from '../../../components/ActivityTimeline';
import AppDrawer from '../../../components/AppDrawer';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface DeviceModelDetailDrawerProps {
  open: boolean;
  model: Asset | null;
  onClose: () => void;
  onEditModel?: (model: Asset) => void;
  onRegisterUnit?: (model: Asset) => void;
}

export const DeviceModelDetailDrawer: React.FC<DeviceModelDetailDrawerProps> = React.memo(
  ({ open, model, onClose, onEditModel, onRegisterUnit }) => {
    const { token } = theme.useToken();

    if (!model) return null;

    const counts = model.unitCounts;
    const total = model.totalUnits ?? counts?.total ?? 0;
    const available = model.availableUnits ?? counts?.available ?? 0;
    const inUse = model.inUseUnits ?? counts?.inUse ?? 0;
    const minThreshold = (model as unknown as { minThreshold?: number }).minThreshold ?? 5;
    const isLowStock = available <= minThreshold && total > 0;
    const utilizationRate = total > 0 ? Math.round((inUse / total) * 100) : 0;

    const costCenterCode =
      typeof model.costCenter === 'object' && model.costCenter !== null
        ? model.costCenter.code
        : typeof model.costCenter === 'string'
          ? model.costCenter
          : null;

    // Parse technical specifications object or string
    let parsedSpecs: Record<string, unknown> = {};
    if (typeof model.specifications === 'string') {
      try {
        parsedSpecs = JSON.parse(model.specifications);
      } catch (_parseErr: unknown) {
        parsedSpecs = { configuration: model.specifications };
      }
    } else if (typeof model.specifications === 'object' && model.specifications !== null) {
      parsedSpecs = model.specifications as Record<string, unknown>;
    }

    const childUnits = model.children || [];

    const unitColumns = [
      {
        title: 'Tag / Code',
        dataIndex: 'tag',
        key: 'tag',
        render: (tag: string, record: Asset) => (
          <Text code strong style={{ color: '#1677ff' }}>
            {record.subcode || tag || record.assetCode || 'N/A'}
          </Text>
        ),
      },
      {
        title: 'Serial Number',
        dataIndex: 'serialNumber',
        key: 'serialNumber',
        render: (sn: string) =>
          sn ? <Text copyable={{ text: sn }}>{sn}</Text> : <Text type="secondary">—</Text>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Tag color={status === 'Active' || status === 'AVAILABLE' ? 'success' : 'processing'}>
            {status}
          </Tag>
        ),
      },
      {
        title: 'Assigned Custodian',
        dataIndex: 'assignedTo',
        key: 'assignedTo',
        render: (assignedTo: string) => assignedTo || <Text type="secondary">Unassigned</Text>,
      },
    ];

    return (
      <AppDrawer
        title={model.name}
        subtitle={
          `${model.manufacturer ? `${model.manufacturer} ` : ''}${model.model || ''}`.trim() ||
          model.category
        }
        icon={<AppstoreOutlined style={{ color: token.colorPrimary }} />}
        tag={
          <Flex align="center" gap={6}>
            <Tag color="blue">{model.modelCode || model.assetCode || model.tag}</Tag>
            {isLowStock && (
              <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0 }}>
                Low Stock ({available} remaining)
              </Tag>
            )}
          </Flex>
        }
        open={open}
        onClose={onClose}
        size={540}
        extra={
          <Flex align="center" gap={8}>
            {onRegisterUnit && (
              <Button
                size="small"
                icon={<PlusCircleOutlined />}
                onClick={() => {
                  onClose();
                  onRegisterUnit(model);
                }}
              >
                Register Unit
              </Button>
            )}
            {onEditModel && (
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  onClose();
                  onEditModel(model);
                }}
              >
                Edit
              </Button>
            )}
          </Flex>
        }
        hideFooter={true}
      >
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: 'Overview & Stock',
              children: (
                <div>
                  <Card
                    size="small"
                    title="Inventory Stock & Fleet Deployment"
                    style={{ marginBottom: 16 }}
                  >
                    <Flex vertical gap={12}>
                      <Flex justify="space-between" align="center">
                        <Flex gap={8} align="center" wrap="wrap">
                          <Tooltip title="Total physical units registered">
                            <Badge
                              count={`Total: ${total}`}
                              style={{ backgroundColor: '#1677ff' }}
                            />
                          </Tooltip>
                          <Tooltip title="Available in stockroom">
                            <Badge
                              count={`Available: ${available}`}
                              style={{ backgroundColor: '#52c41a' }}
                            />
                          </Tooltip>
                          <Tooltip title="Deployed / assigned to staff">
                            <Badge
                              count={`In Use: ${inUse}`}
                              style={{ backgroundColor: '#722ed1' }}
                            />
                          </Tooltip>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Min Threshold: {minThreshold}
                        </Text>
                      </Flex>
                      <div>
                        <Flex justify="space-between" style={{ marginBottom: 4 }}>
                          <Text style={{ fontSize: 12 }}>Fleet Utilization Rate</Text>
                          <Text strong style={{ fontSize: 12 }}>
                            {utilizationRate}%
                          </Text>
                        </Flex>
                        <Progress
                          percent={utilizationRate}
                          status={isLowStock ? 'exception' : 'active'}
                          size="small"
                        />
                      </div>
                    </Flex>
                  </Card>

                  <Descriptions
                    title="Model Master Data"
                    bordered
                    size="small"
                    column={1}
                    styles={{ label: { whiteSpace: 'nowrap' } }}
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions.Item label="Category">
                      {model.category ? (
                        <Tag color="blue">{model.category}</Tag>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Unit Cost">
                      {model.unitCost != null ? (
                        <Text style={{ fontFamily: 'monospace' }}>
                          $
                          {model.unitCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cost Center">
                      {costCenterCode ? (
                        <Tag color="geekblue">{costCenterCode}</Tag>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bin Location">
                      {(model as unknown as { binNumber?: string }).binNumber ||
                        (model.deviceModel as unknown as { binLocation?: string })?.binLocation || (
                          <Text type="secondary">—</Text>
                        )}
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions
                    title="Physical & Environmental Specifications"
                    bordered
                    size="small"
                    column={1}
                    styles={{ label: { whiteSpace: 'nowrap' } }}
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions.Item label="Dimensions">
                      {(parsedSpecs.dimensions as string) || (parsedSpecs.formFactor as string) || (
                        <Text type="secondary">Standard Desktop / Rack Unit</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Weight">
                      {(parsedSpecs.weight as string) || (
                        <Text type="secondary">Standard Weight Specification</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Power & PSU">
                      {(parsedSpecs.power as string) ||
                        (parsedSpecs.powerWatts ? `${parsedSpecs.powerWatts}W` : null) || (
                          <Text type="secondary">Standard Enterprise AC 100-240V</Text>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Lifecycle & Support">
                      {(parsedSpecs.eolDate as string) || (parsedSpecs.endOfLife as string) || (
                        <Text type="secondary">Active Lifecycle Support</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Hardware Specs">
                      {typeof model.specifications === 'string' && model.specifications ? (
                        <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {model.specifications}
                        </Text>
                      ) : (
                        <Text type="secondary">Standard Configuration</Text>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            },
            {
              key: 'units',
              label: `Physical Units (${childUnits.length || total})`,
              children: (
                <div>
                  {childUnits.length > 0 ? (
                    <Table
                      size="small"
                      columns={unitColumns}
                      dataSource={childUnits}
                      rowKey="id"
                      pagination={{ pageSize: 5 }}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={`No physical units currently loaded. Total registered: ${total}`}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'history',
              label: 'History',
              children: <ActivityTimeline entityType="Hardware" entityId={model.id} />,
            },
          ]}
        />
      </AppDrawer>
    );
  },
);

DeviceModelDetailDrawer.displayName = 'DeviceModelDetailDrawer';
