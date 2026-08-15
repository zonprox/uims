import {
  AuditOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LaptopOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Empty, Flex, Input, Modal, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../services/api';

const { Text } = Typography;

interface CommandItem {
  key: string;
  title: string;
  category: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

const COMMAND_ITEMS: Array<CommandItem> = [
  {
    key: 'dashboard',
    title: 'Operations Center',
    category: 'Overview',
    path: '/',
    icon: <BarChartOutlined />,
    description: 'Asset health, telemetry KPIs, and recent audit activity',
  },
  {
    key: 'assets',
    title: 'Hardware Fleet',
    category: 'Assets',
    path: '/assets',
    icon: <LaptopOutlined />,
    description: 'Manage laptops, workstations, monitors, servers, and specs',
  },
  {
    key: 'licenses',
    title: 'Software & SaaS Assets',
    category: 'Software',
    path: '/licenses',
    icon: <SafetyCertificateOutlined />,
    description: 'Track software licenses, seat allocations, and renewals',
  },
  {
    key: 'inventory',
    title: 'Spare Stockroom',
    category: 'Inventory',
    path: '/inventory',
    icon: <DatabaseOutlined />,
    description: 'Stock levels, spare parts, peripherals, and reorder alerts',
  },
  {
    key: 'network',
    title: 'Network & IPAM',
    category: 'Infrastructure',
    path: '/network',
    icon: <GlobalOutlined />,
    description: 'IPAM, subnets, VLANs, and hardware network reservations',
  },
  {
    key: 'directory',
    title: 'Asset Custodians',
    category: 'Custodians',
    path: '/directory',
    icon: <TeamOutlined />,
    description: 'Employee directory and allocated equipment tracking',
  },
  {
    key: 'reports',
    title: 'Lifecycle & Valuation Reports',
    category: 'Analytics',
    path: '/reports',
    icon: <BarChartOutlined />,
    description: 'Asset valuation, depreciation curves, and financial summaries',
  },
  {
    key: 'audit',
    title: 'Asset Audit Trail',
    category: 'Governance',
    path: '/audit',
    icon: <AuditOutlined />,
    description: 'Lifecycle logs, custodian changes, and compliance events',
  },
  {
    key: 'settings',
    title: 'System Preferences',
    category: 'System',
    path: '/settings',
    icon: <SettingOutlined />,
    description: 'Theme customization, organization profile, and snapshots',
  },
];

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  path: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<Array<SearchResultItem>>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setLiveResults([]);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setLiveResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/search', { params: { q: trimmed, limit: 8 } });
        const items = res.data?.data?.results || res.data?.results || [];
        setLiveResults(items);
      } catch {
        setLiveResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredCommands = COMMAND_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()),
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Asset':
        return <LaptopOutlined />;
      case 'License':
        return <SafetyCertificateOutlined />;
      case 'Directory':
        return <TeamOutlined />;
      default:
        return <SearchOutlined />;
    }
  };

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      closable={false}
      styles={{
        body: {
          padding: 0,
          overflow: 'hidden',
        },
      }}
      width={560}
      centered
    >
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(140, 140, 140, 0.12)' }}>
        <Input
          prefix={<SearchOutlined style={{ fontSize: 16, color: '#94a3b8', marginRight: 6 }} />}
          placeholder="Search assets, licenses, users, or jump to page..."
          variant="borderless"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{ fontSize: 14 }}
          suffix={loading ? <Spin size="small" /> : null}
        />
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 8px' }}>
        {/* Live Search Results from Backend / Meilisearch */}
        {liveResults.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#94a3b8',
                padding: '6px 12px 2px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Search Results
            </div>
            <Flex vertical gap={2}>
              {liveResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.path)}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: 6,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(22, 119, 255, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                    <Flex align="center" gap={10}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          background: 'rgba(22, 119, 255, 0.12)',
                          color: '#1677ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                        }}
                      >
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 11.5 }}>
                              {item.subtitle}
                            </Text>
                          </div>
                        )}
                      </div>
                    </Flex>
                    <Tag color="blue" style={{ fontSize: 10.5 }}>
                      {item.category}
                    </Tag>
                  </Flex>
                </div>
              ))}
            </Flex>
          </div>
        )}

        {/* Command Navigation Results */}
        <div>
          {liveResults.length > 0 && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#94a3b8',
                padding: '6px 12px 2px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Navigation Commands
            </div>
          )}
          {filteredCommands.length === 0 && liveResults.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No matching results or commands found"
              style={{ margin: '20px 0' }}
            />
          ) : (
            <Flex vertical gap={2}>
              {filteredCommands.map((item) => (
                <div
                  key={item.key}
                  onClick={() => handleSelect(item.path)}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: 6,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(22, 119, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                    <Flex align="center" gap={10}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          background: 'rgba(22, 119, 255, 0.08)',
                          color: '#1677ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          {item.title}
                        </Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11.5 }}>
                            {item.description}
                          </Text>
                        </div>
                      </div>
                    </Flex>
                    <Tag color="default" style={{ fontSize: 11 }}>
                      {item.category}
                    </Tag>
                  </Flex>
                </div>
              ))}
            </Flex>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(140, 140, 140, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(140, 140, 140, 0.02)',
        }}
      >
        <Text type="secondary" style={{ fontSize: 11.5 }}>
          Press{' '}
          <kbd
            style={{ padding: '1px 4px', background: 'rgba(140, 140, 140, 0.15)', borderRadius: 3 }}
          >
            ESC
          </kbd>{' '}
          to close
        </Text>
        <Text type="secondary" style={{ fontSize: 11.5 }}>
          Instant Fuzzy Search
        </Text>
      </div>
    </Modal>
  );
}
