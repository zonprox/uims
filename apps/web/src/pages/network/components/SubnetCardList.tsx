import { Card, Col, Flex, Progress, Row, Tag, Typography } from 'antd';
import React from 'react';
import type { Subnet } from '../../../services/network.service';

const { Text } = Typography;

export interface SubnetCardListProps {
  subnets: Array<Subnet>;
}

export const SubnetCardList: React.FC<SubnetCardListProps> = React.memo(({ subnets }) => (
  <Row gutter={[14, 14]}>
    {subnets.map((subnet) => {
      const percent = Math.round((subnet.usedIps / subnet.totalIps) * 100);
      let strokeColor = '#10b981';
      if (percent > 85) strokeColor = '#ef4444';
      else if (percent > 60) strokeColor = '#f59e0b';

      return (
        <Col xs={24} sm={12} lg={6} key={subnet.id}>
          <Card
            size="small"
            title={
              <Text code style={{ fontSize: 13, color: '#1677ff' }}>
                {subnet.cidr}
              </Text>
            }
            extra={<Tag color="blue">{subnet.vlanName || subnet.name}</Tag>}
          >
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
              {subnet.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 8 }}>
              Gateway: {subnet.gateway} • {subnet.location}
            </Text>
            <Flex justify="space-between" style={{ fontSize: 11.5, marginBottom: 2 }}>
              <Text>
                {subnet.usedIps} / {subnet.totalIps} IPs Used
              </Text>
              <Text type="secondary">{percent}%</Text>
            </Flex>
            <Progress percent={percent} strokeColor={strokeColor} size="small" showInfo={false} />
          </Card>
        </Col>
      );
    })}
  </Row>
));

SubnetCardList.displayName = 'SubnetCardList';
