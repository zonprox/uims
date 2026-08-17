import {
  BranchesOutlined,
  CopyOutlined,
  DesktopOutlined,
  FolderOpenOutlined,
  ShareAltOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { OrganizationalUnit } from '@uims/shared-types';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Progress,
  Row,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

const { Text, Title, Paragraph } = Typography;

interface OrganizationalUnitsTabProps {
  units: OrganizationalUnit[];
  totalUsers: number;
  onFilterByOU: (ouDn: string) => void;
}

export function OrganizationalUnitsTab({
  units,
  totalUsers,
  onFilterByOU,
}: OrganizationalUnitsTabProps) {
  const { message } = App.useApp();

  const copyDn = (dn: string) => {
    navigator.clipboard.writeText(dn);
    message.success(`Copied Distinguished Name: ${dn}`);
  };

  return (
    <div>
      {/* Topology Header */}
      <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f8fafc' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Flex align="center" gap={12}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BranchesOutlined style={{ fontSize: 22, color: '#0284c7' }} />
              </div>
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  Active Directory Forest & Organizational Units (OU) Topology
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Canonical Distinguished Name (DN) tree:{' '}
                  <Text code>DC=corp,DC=uims,DC=internal</Text> • Primary DC:{' '}
                  <Text code>DC01-PRIMARY</Text>
                </Text>
              </div>
            </Flex>
          </Col>
          <Col xs={24} md={8}>
            <Flex justify="flex-end" gap={8} wrap>
              <Tag color="cyan" style={{ padding: '4px 8px', fontSize: 12 }}>
                Forest Level: Windows Server 2025/2026
              </Tag>
              <Tag color="blue" style={{ padding: '4px 8px', fontSize: 12 }}>
                {units.length} Organizational Units
              </Tag>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* OU Cards Grid */}
      <Row gutter={[16, 16]}>
        {units.map((unit) => {
          const userPercent = totalUsers > 0 ? Math.round((unit.userCount / totalUsers) * 100) : 0;

          return (
            <Col xs={24} sm={12} lg={8} key={unit.id || unit.dn}>
              <Card
                size="small"
                hoverable
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                styles={{
                  body: { padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' },
                }}
                title={
                  <Flex align="center" gap={8}>
                    <FolderOpenOutlined style={{ color: '#1677ff' }} />
                    <span style={{ fontSize: 13.5 }}>{unit.name}</span>
                  </Flex>
                }
                extra={
                  <Tooltip title="Copy Distinguished Name (DN)">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyDn(unit.dn)}
                    />
                  </Tooltip>
                }
              >
                <Flex vertical gap={10} style={{ flex: 1 }}>
                  <div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11, display: 'block', marginBottom: 2 }}
                    >
                      Distinguished Name (DN):
                    </Text>
                    <Text code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                      {unit.dn}
                    </Text>
                  </div>

                  {unit.description && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 12, margin: 0, minHeight: 36 }}
                    >
                      {unit.description}
                    </Paragraph>
                  )}

                  <Divider style={{ margin: '6px 0' }} />

                  <Row gutter={[8, 8]}>
                    <Col span={8}>
                      <div
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '6px 8px',
                          borderRadius: 6,
                          textAlign: 'center',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 10.5, display: 'block' }}>
                          <TeamOutlined style={{ marginRight: 4 }} />
                          Users
                        </Text>
                        <Text strong style={{ fontSize: 14, color: '#1677ff' }}>
                          {unit.userCount}
                        </Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '6px 8px',
                          borderRadius: 6,
                          textAlign: 'center',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 10.5, display: 'block' }}>
                          <DesktopOutlined style={{ marginRight: 4 }} />
                          PCs
                        </Text>
                        <Text strong style={{ fontSize: 14, color: '#0ea5e9' }}>
                          {unit.workstationCount}
                        </Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '6px 8px',
                          borderRadius: 6,
                          textAlign: 'center',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 10.5, display: 'block' }}>
                          <ShareAltOutlined style={{ marginRight: 4 }} />
                          Groups
                        </Text>
                        <Text strong style={{ fontSize: 14, color: '#8b5cf6' }}>
                          {unit.groupCount}
                        </Text>
                      </div>
                    </Col>
                  </Row>

                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Workforce Share:
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: 600 }}>{userPercent}%</Text>
                    </Flex>
                    <Progress
                      percent={userPercent}
                      size="small"
                      showInfo={false}
                      strokeColor="#1677ff"
                    />

                    <Flex justify="flex-end" style={{ marginTop: 12 }}>
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0 }}
                        onClick={() => onFilterByOU(unit.name)}
                      >
                        View Domain Members →
                      </Button>
                    </Flex>
                  </div>
                </Flex>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
