import {
  AuditOutlined,
  BarChartOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LaptopOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Flex, Input, List, Modal, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

const { Text } = Typography;

interface CommandItem {
  key: string;
  title: string;
  category: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    key: 'dashboard',
    title: 'Dashboard Overview',
    category: 'Navigation',
    path: '/',
    icon: <BarChartOutlined />,
    description: 'System health, KPIs, and recent activity',
  },
  {
    key: 'assets',
    title: 'Asset Management',
    category: 'Inventory',
    path: '/assets',
    icon: <LaptopOutlined />,
    description: 'Manage laptops, workstations, monitors, and servers',
  },
  {
    key: 'licenses',
    title: 'License Management',
    category: 'Software',
    path: '/licenses',
    icon: <SafetyCertificateOutlined />,
    description: 'Track software seats, subscriptions, and renewals',
  },
  {
    key: 'directory',
    title: 'Directory Services',
    category: 'Identity',
    path: '/directory',
    icon: <TeamOutlined />,
    description: 'Employees, departments, and access roles',
  },
  {
    key: 'email',
    title: 'Email Management',
    category: 'Communication',
    path: '/email',
    icon: <MailOutlined />,
    description: 'Mailboxes, shared accounts, and quota usage',
  },
  {
    key: 'network',
    title: 'Network & IP Management',
    category: 'Infrastructure',
    path: '/network',
    icon: <GlobalOutlined />,
    description: 'IPAM, subnets, VLANs, and DHCP reservations',
  },
  {
    key: 'inventory',
    title: 'Hardware Inventory',
    category: 'Storage',
    path: '/inventory',
    icon: <DatabaseOutlined />,
    description: 'Stock levels, consumables, cables, and peripherals',
  },
  {
    key: 'tickets',
    title: 'Helpdesk & Tickets',
    category: 'Support',
    path: '/tickets',
    icon: <CustomerServiceOutlined />,
    description: 'User requests, incident tracking, and SLAs',
  },
  {
    key: 'audit',
    title: 'Audit & Compliance',
    category: 'Security',
    path: '/audit',
    icon: <AuditOutlined />,
    description: 'Security logs, system changes, and compliance events',
  },
  {
    key: 'reports',
    title: 'Reports & Analytics',
    category: 'Analytics',
    path: '/reports',
    icon: <BarChartOutlined />,
    description: 'Cost analysis, asset depreciation, and SLA metrics',
  },
  {
    key: 'settings',
    title: 'System Settings',
    category: 'Admin',
    path: '/settings',
    icon: <SettingOutlined />,
    description: 'General preferences, appearance, security, and backups',
  },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const filteredItems = COMMAND_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()),
  );

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
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(140, 140, 140, 0.15)' }}>
        <Input
          prefix={<SearchOutlined style={{ fontSize: 18, color: '#999', marginRight: 8 }} />}
          placeholder="Type a command or search pages... (e.g. Assets, Licenses, Tickets)"
          variant="borderless"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{ fontSize: 16 }}
        />
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 12px' }}>
        <List
          dataSource={filteredItems}
          locale={{ emptyText: 'No matching commands or pages found' }}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleSelect(item.path)}
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                borderBottom: 'none',
                transition: 'background 0.2s',
              }}
              className="command-item-hover"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(22, 119, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                <Flex align="center" gap={12}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 6,
                      background: 'rgba(22, 119, 255, 0.1)',
                      color: '#1677ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 14 }}>
                      {item.title}
                    </Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.description}
                      </Text>
                    </div>
                  </div>
                </Flex>
                <Tag color="default">{item.category}</Tag>
              </Flex>
            </List.Item>
          )}
        />
      </div>

      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid rgba(140, 140, 140, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(140, 140, 140, 0.03)',
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Press{' '}
          <kbd
            style={{ padding: '2px 6px', background: 'rgba(140, 140, 140, 0.15)', borderRadius: 4 }}
          >
            ESC
          </kbd>{' '}
          to close
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Quick Navigator
        </Text>
      </div>
    </Modal>
  );
}
