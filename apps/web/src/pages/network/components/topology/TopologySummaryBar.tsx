import {
  ApiOutlined,
  DeploymentUnitOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { TopologyMetrics } from '@uims/shared-types';
import { Card, Col, Progress, Row, Space, Statistic, Tag, Typography, theme } from 'antd';
import React from 'react';
import type { TopologyViewMode } from './types';

const { Text } = Typography;

export interface TopologySummaryBarProps {
  metrics?: Partial<TopologyMetrics> | null;
  viewMode: TopologyViewMode;
  loading?: boolean;
}

export const TopologySummaryBar: React.FC<TopologySummaryBarProps> = React.memo(
  ({ metrics, viewMode }) => {
    const { token } = theme.useToken();

    const totalNodes = metrics?.totalNodes ?? 0;
    const totalSwitches = metrics?.totalSwitches ?? 0;
    const totalRacks = metrics?.totalRacks ?? 0;
    const totalCameras = metrics?.totalCameras ?? 0;
    const totalNvrs = metrics?.totalNvrs ?? 0;
    const totalServers = metrics?.totalServers ?? 0;
    const totalEdges = metrics?.totalEdges ?? 0;
    const activeLinks = metrics?.activeLinks ?? 0;
    const degradedLinks = metrics?.degradedLinks ?? 0;
    const downLinks = metrics?.downLinks ?? 0;
    const poeWatts = metrics?.poePowerUsageWatts ?? 0;
    const onlinePct =
      metrics?.onlinePercentage ??
      (totalEdges > 0 ? Math.round((activeLinks / totalEdges) * 100) : 100);

    const fleetSuffix =
      viewMode === 'CCTV'
        ? `${totalCameras} Cams · ${totalNvrs} NVRs`
        : viewMode === 'NETWORK'
          ? `${totalSwitches} Switches · ${totalServers} Servers`
          : `${totalSwitches} Sw · ${totalCameras} Cam · ${totalRacks} Racks`;

    return (
      <div data-testid="topology-summary-bar" style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]}>
          {/* Card 1: Fleet Nodes */}
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              styles={{ body: { padding: '12px 16px' } }}
              data-testid="summary-card-fleet-nodes"
            >
              <Statistic
                title="Fleet Nodes"
                value={totalNodes}
                prefix={<DeploymentUnitOutlined style={{ color: token.colorPrimary }} />}
                suffix={
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {fleetSuffix}
                  </Text>
                }
              />
            </Card>
          </Col>

          {/* Card 2: Link Signaling & Health */}
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              styles={{ body: { padding: '12px 16px' } }}
              data-testid="summary-card-active-links"
            >
              <Statistic
                title="Active Links"
                value={`${activeLinks} / ${totalEdges}`}
                prefix={<ApiOutlined style={{ color: token.colorSuccess }} />}
                suffix={
                  <Space size={4} style={{ marginLeft: 8 }}>
                    <Tag color="success" style={{ margin: 0 }}>
                      {activeLinks} Up
                    </Tag>
                    {degradedLinks > 0 && (
                      <Tag color="warning" style={{ margin: 0 }}>
                        {degradedLinks} Flapping
                      </Tag>
                    )}
                    {downLinks > 0 && (
                      <Tag color="error" style={{ margin: 0 }}>
                        {downLinks} Down
                      </Tag>
                    )}
                  </Space>
                }
              />
            </Card>
          </Col>

          {/* Card 3: Active PoE Power Budget */}
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              styles={{ body: { padding: '12px 16px' } }}
              data-testid="summary-card-poe-power"
            >
              <Statistic
                title="PoE Power Draw"
                value={Number(poeWatts.toFixed(1))}
                precision={1}
                suffix="W"
                prefix={<ThunderboltOutlined style={{ color: token.colorWarning }} />}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                IEEE 802.3af/at active delivery
              </Text>
            </Card>
          </Col>

          {/* Card 4: Perspective Health Index */}
          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              styles={{ body: { padding: '12px 16px' } }}
              data-testid="summary-card-health-index"
            >
              <Statistic
                title={viewMode === 'CCTV' ? 'Stream Health' : 'Network Availability'}
                value={onlinePct}
                suffix="%"
                prefix={<EyeOutlined style={{ color: token.colorInfo }} />}
              />
              <Progress
                percent={onlinePct}
                size="small"
                showInfo={false}
                strokeColor={onlinePct >= 95 ? token.colorSuccess : token.colorWarning}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  },
);

TopologySummaryBar.displayName = 'TopologySummaryBar';
