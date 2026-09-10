import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Card, Col, Flex, Popconfirm, Progress, Row, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import type { Subnet } from '../../../services/network.service';

const { Text } = Typography;

export interface SubnetCardListProps {
  subnets: Array<Subnet>;
  onOpenDetailDrawer?: (subnet: Subnet) => void;
  onOpenEditModal?: (subnet: Subnet) => void;
  onDeleteSubnet?: (id: string) => void;
}

export const SubnetCardList: React.FC<SubnetCardListProps> = React.memo(
  ({ subnets, onOpenDetailDrawer, onOpenEditModal, onDeleteSubnet }) => (
    <Row gutter={[14, 14]}>
      {subnets.map((subnet) => {
        const total = subnet.totalIps || 254;
        const used = subnet.usedIps || 0;
        const reserved = subnet.reservedIps || 0;
        const available = Math.max(0, total - used - reserved);
        const percent = total > 0 ? Math.round((used / total) * 100) : 0;

        let strokeColor = '#10b981';
        if (percent > 85) strokeColor = '#ef4444';
        else if (percent > 60) strokeColor = '#f59e0b';

        return (
          <Col xs={24} sm={12} lg={8} xl={6} key={subnet.id}>
            <Card
              size="small"
              title={
                <Text code style={{ fontSize: 13, color: '#1677ff' }}>
                  {subnet.cidr}
                </Text>
              }
              extra={
                subnet.vlan ? (
                  <Tag color="purple">VLAN {subnet.vlan.vlanNumber}</Tag>
                ) : subnet.vlanName ? (
                  <Tag color="purple">{subnet.vlanName}</Tag>
                ) : (
                  <Tag color="blue">{subnet.name}</Tag>
                )
              }
              actions={[
                ...(onOpenDetailDrawer
                  ? [
                      <Tooltip key="view" title="Inspect CIDR & IPs">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => onOpenDetailDrawer(subnet)}
                        />
                      </Tooltip>,
                    ]
                  : []),
                ...(onOpenEditModal
                  ? [
                      <Tooltip key="edit" title="Edit Subnet">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => onOpenEditModal(subnet)}
                        />
                      </Tooltip>,
                    ]
                  : []),
                ...(onDeleteSubnet
                  ? [
                      <Popconfirm
                        key="delete"
                        title="Delete subnet?"
                        description={`Remove ${subnet.cidr}?`}
                        onConfirm={() => onDeleteSubnet(subnet.id)}
                        okType="danger"
                      >
                        <Tooltip title="Delete">
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>,
                    ]
                  : []),
              ]}
            >
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                {subnet.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                Gateway: {subnet.gateway || '—'} •{' '}
                {subnet.location?.name || subnet.locationName || 'HQ'}
              </Text>

              {/* Technical CIDR badges */}
              <Flex wrap gap={4} style={{ marginBottom: 10 }}>
                <Tag style={{ fontSize: 10.5, margin: 0 }}>
                  Mask: {subnet.netmask || '255.255.255.0'}
                </Tag>
                {subnet.startIp && subnet.endIp && (
                  <Tag style={{ fontSize: 10.5, margin: 0 }}>
                    {subnet.startIp} - {subnet.endIp}
                  </Tag>
                )}
              </Flex>

              {/* 3-Segment Capacity Breakdown */}
              <Tooltip
                title={`Allocated: ${used} | Reserved: ${reserved} | Available: ${available} (Total: ${total})`}
              >
                <div>
                  <Flex justify="space-between" style={{ fontSize: 11.5, marginBottom: 2 }}>
                    <Text>
                      {used} used / {available} free
                    </Text>
                    <Text type="secondary">{percent}%</Text>
                  </Flex>
                  <Progress
                    percent={percent}
                    strokeColor={strokeColor}
                    size="small"
                    showInfo={false}
                  />
                </div>
              </Tooltip>
            </Card>
          </Col>
        );
      })}
    </Row>
  ),
);

SubnetCardList.displayName = 'SubnetCardList';
