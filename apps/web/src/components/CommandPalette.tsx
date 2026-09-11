import {
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LaptopOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Empty, Flex, Input, Modal, Spin, Tag, Typography, theme } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  shortcut?: string;
}

const COMMAND_ITEMS: Array<CommandItem> = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    category: 'Overview',
    path: '/',
    icon: <BarChartOutlined />,
    description: 'Asset health, telemetry KPIs, and recent audit activity',
    shortcut: '1',
  },
  {
    key: 'assets',
    title: 'Hardware Assets',
    category: 'Assets',
    path: '/assets',
    icon: <LaptopOutlined />,
    description: 'Manage laptops, workstations, monitors, servers, and specs',
    shortcut: '2',
  },
  {
    key: 'licenses',
    title: 'Software Licenses',
    category: 'Software',
    path: '/licenses',
    icon: <SafetyCertificateOutlined />,
    description: 'Track software licenses, seat allocations, and renewals',
    shortcut: '3',
  },
  {
    key: 'inventory',
    title: 'Inventory',
    category: 'Inventory',
    path: '/inventory',
    icon: <DatabaseOutlined />,
    description: 'Stock levels, spare parts, peripherals, and reorder alerts',
    shortcut: '4',
  },
  {
    key: 'network',
    title: 'Network & IPAM',
    category: 'Infrastructure',
    path: '/network',
    icon: <GlobalOutlined />,
    description: 'IPAM, subnets, VLANs, and hardware network reservations',
    shortcut: '5',
  },
  {
    key: 'organization',
    title: 'Organization Structure',
    category: 'Organization',
    path: '/organization',
    icon: <ApartmentOutlined />,
    description: 'Corporate entities, facilities, hierarchical departments, and job titles',
    shortcut: '6',
  },
  {
    key: 'users',
    title: 'Users',
    category: 'Access',
    path: '/users',
    icon: <UserOutlined />,
    description: 'Manage console login users, RBAC roles, security status, and permission matrix',
    shortcut: '7',
  },
  {
    key: 'directory',
    title: 'Employee Directory',
    category: 'Directory',
    path: '/directory',
    icon: <TeamOutlined />,
    description:
      'Corporate employee directory records, Active Directory synchronization, and workstation custodians',
    shortcut: '8',
  },
  {
    key: 'reports',
    title: 'Reports & Analytics',
    category: 'Analytics',
    path: '/reports',
    icon: <BarChartOutlined />,
    description: 'Asset valuation, depreciation curves, and financial summaries',
    shortcut: '9',
  },
  {
    key: 'audit',
    title: 'Audit Trail',
    category: 'Governance',
    path: '/audit',
    icon: <AuditOutlined />,
    description: 'Lifecycle logs, custodian changes, and compliance events',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    category: 'System',
    path: '/notifications',
    icon: <BellOutlined />,
    description: 'View real-time alerts, system messages, and task reminders',
  },
  {
    key: 'settings',
    title: 'Settings',
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const navigate = useNavigate();

  const { token } = theme.useToken();

  const isMac =
    typeof navigator !== 'undefined' &&
    /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent || '');
  const modKey = isMac ? '⌘' : 'Ctrl ';

  useEffect(() => {
    if (!open) {
      setQuery('');
      setLiveResults([]);
      setLoading(false);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    setSelectedIndex(0);
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
      } catch (_error: unknown) {
        setLiveResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase();
    return COMMAND_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [query]);

  const allNavigableItems = useMemo(() => {
    const list: Array<{ path: string }> = [];
    for (const item of liveResults) {
      list.push({ path: item.path });
    }
    for (const item of filteredCommands) {
      list.push({ path: item.path });
    }
    return list;
  }, [liveResults, filteredCommands]);

  useEffect(() => {
    if (selectedIndex >= allNavigableItems.length && allNavigableItems.length > 0) {
      setSelectedIndex(allNavigableItems.length - 1);
    }
  }, [allNavigableItems.length, selectedIndex]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = allNavigableItems.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (total > 0) {
        setSelectedIndex((prev) => (prev + 1) % total);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (total > 0) {
        setSelectedIndex((prev) => (prev - 1 + total) % total);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const target = allNavigableItems[selectedIndex];
      if (target) {
        handleSelect(target.path);
      }
      return;
    }

    // Direct jump via Cmd+1..9 or Ctrl+1..9
    if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
      const matched = COMMAND_ITEMS.find((c) => c.shortcut === e.key);
      if (matched) {
        e.preventDefault();
        handleSelect(matched.path);
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const footerKbdStyle: React.CSSProperties = {
    fontSize: 10,
    padding: '1px 5px',
    background: token.colorFillSecondary,
    borderRadius: token.borderRadiusSM,
    color: token.colorTextSecondary,
    border: `1px solid ${token.colorBorderSecondary}`,
    fontFamily: 'monospace',
    fontWeight: 500,
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
          backgroundColor: token.colorBgElevated,
          borderRadius: token.borderRadiusLG,
        },
      }}
      width={580}
      centered
    >
      <div onKeyDown={handleKeyDown} tabIndex={-1} style={{ outline: 'none' }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Input
            prefix={
              <SearchOutlined
                style={{ fontSize: 16, color: token.colorTextTertiary, marginRight: 6 }}
              />
            }
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
                  color: token.colorTextTertiary,
                  padding: '6px 12px 2px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Search Results
              </div>
              <Flex vertical gap={2}>
                {liveResults.map((item, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onMouseOver={() => setSelectedIndex(index)}
                      style={{
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: token.borderRadius,
                        backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                        <Flex align="center" gap={10}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: token.borderRadiusSM,
                              background: token.colorPrimaryBg,
                              color: token.colorPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {getCategoryIcon(item.category)}
                          </div>
                          <div>
                            <Text strong style={{ fontSize: 13, color: token.colorText }}>
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
                        <Tag color="blue" style={{ fontSize: 10.5, margin: 0 }}>
                          {item.category}
                        </Tag>
                      </Flex>
                    </div>
                  );
                })}
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
                  color: token.colorTextTertiary,
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
                {filteredCommands.map((item, cmdIdx) => {
                  const overallIndex = liveResults.length + cmdIdx;
                  const isSelected = selectedIndex === overallIndex;
                  return (
                    <div
                      key={item.key}
                      ref={(el) => {
                        itemRefs.current[overallIndex] = el;
                      }}
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(overallIndex)}
                      onMouseOver={() => setSelectedIndex(overallIndex)}
                      style={{
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: token.borderRadius,
                        backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                        <Flex align="center" gap={10}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: token.borderRadiusSM,
                              background: token.colorPrimaryBg,
                              color: token.colorPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <Text strong style={{ fontSize: 13, color: token.colorText }}>
                              {item.title}
                            </Text>
                            <div>
                              <Text type="secondary" style={{ fontSize: 11.5 }}>
                                {item.description}
                              </Text>
                            </div>
                          </div>
                        </Flex>
                        <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
                          <Tag color="default" style={{ fontSize: 11, margin: 0 }}>
                            {item.category}
                          </Tag>
                          {item.shortcut && (
                            <kbd
                              style={{
                                fontSize: 10.5,
                                padding: '1px 5px',
                                background: token.colorFillSecondary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: token.borderRadiusSM,
                                color: token.colorTextSecondary,
                                fontWeight: 600,
                                lineHeight: 1.4,
                                fontFamily: 'monospace',
                              }}
                            >
                              {modKey}
                              {item.shortcut}
                            </kbd>
                          )}
                        </Flex>
                      </Flex>
                    </div>
                  );
                })}
              </Flex>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '8px 16px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: token.colorBgLayout,
          }}
        >
          <Flex align="center" gap={12} wrap="wrap">
            <Flex align="center" gap={4}>
              <kbd style={footerKbdStyle}>↑</kbd>
              <kbd style={footerKbdStyle}>↓</kbd>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Navigate
              </Text>
            </Flex>
            <Flex align="center" gap={4}>
              <kbd style={footerKbdStyle}>↵</kbd>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Select
              </Text>
            </Flex>
            <Flex align="center" gap={4}>
              <kbd style={footerKbdStyle}>{isMac ? '⌘1-9' : 'Ctrl 1-9'}</kbd>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Quick Jump
              </Text>
            </Flex>
            <Flex align="center" gap={4}>
              <kbd style={footerKbdStyle}>ESC</kbd>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Close
              </Text>
            </Flex>
          </Flex>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Instant Search
          </Text>
        </div>
      </div>
    </Modal>
  );
}
