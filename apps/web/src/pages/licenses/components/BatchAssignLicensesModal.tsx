import {
  IdcardOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Card,
  Descriptions,
  Flex,
  Select,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import AppDrawer from '../../../components/AppDrawer';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import type { License } from '../../../services/licenses.service';

const { Text } = Typography;

const formatUserDisplayName = (u: DirectoryUser): string =>
  u.fullName?.trim() ||
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
  u.displayName?.trim() ||
  u.email;

export const formatUserSelectLabel = (u: DirectoryUser): string => {
  const name = formatUserDisplayName(u);
  if (u.employeeCode) {
    return `${name} (${u.employeeCode})`;
  }
  if (name !== u.email && u.email) {
    return `${name} (${u.email})`;
  }
  return name;
};

export interface BatchAssignLicensesModalProps {
  open: boolean;
  licenses: License[];
  submitting: boolean;
  onAssign: (userId: string) => void;
  onCancel: () => void;
  employees?: DirectoryUser[]; // For test isolation
  initialUserId?: string;
}

export const BatchAssignLicensesModal: React.FC<BatchAssignLicensesModalProps> = React.memo(
  ({ open, licenses, submitting, onAssign, onCancel, employees: propEmployees, initialUserId }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);

    useEffect(() => {
      if (!open) {
        setSelectedUserId(null);
        return;
      }

      setSelectedUserId(initialUserId || null);

      let mounted = true;
      const loadEmployees = async () => {
        setLoadingEmployees(true);
        try {
          const res = propEmployees
            ? { items: propEmployees }
            : await directoryService.getEmployees({ pageSize: 100 });
          if (mounted) {
            setEmployees(res.items || []);
          }
        } catch (error: unknown) {
          message.error(error instanceof Error ? error.message : 'Failed to load employees.');
        } finally {
          if (mounted) setLoadingEmployees(false);
        }
      };

      loadEmployees();

      return () => {
        mounted = false;
      };
    }, [open, propEmployees, message, initialUserId]);

    const selectedUser = useMemo(
      () => employees.find((u) => u.id === selectedUserId) || null,
      [employees, selectedUserId],
    );

    const count = licenses.length;
    const exhaustedLicenses = useMemo(
      () => licenses.filter((l) => Math.max(0, l.totalSeats - l.usedSeats) <= 0),
      [licenses],
    );

    const handleOk = async () => {
      if (!selectedUserId) return;
      try {
        await onAssign(selectedUserId);
      } catch (err: unknown) {
        message.error(
          err instanceof Error ? err.message : 'Failed to complete license assignment.',
        );
      }
    };

    return (
      <AppDrawer
        open={open}
        onClose={onCancel}
        onCancel={onCancel}
        title="Batch Assign Software Licenses"
        subtitle={`${count} license${count === 1 ? '' : 's'} to assign`}
        icon={<UserSwitchOutlined />}
        tag={
          <Tag color="blue">
            {count} License{count === 1 ? '' : 's'}
          </Tag>
        }
        size={580}
        onOk={handleOk}
        okText={`Assign ${count} License${count !== 1 ? 's' : ''}`}
        okLoading={submitting}
        okDisabled={!selectedUserId || count === 0}
        cancelText="Cancel"
        destroyOnHidden
      >
        <Flex vertical gap={16}>
          <AppDrawer.Section
            title="Selected Software Licenses"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {count} license{count === 1 ? '' : 's'} selected
              </Text>
            }
          >
            <Flex wrap gap={6} style={{ maxHeight: 96, overflowY: 'auto', padding: '2px 0' }}>
              {licenses.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  No software licenses selected
                </Text>
              ) : (
                <>
                  {licenses.slice(0, 15).map((lic) => {
                    const remaining = Math.max(0, lic.totalSeats - lic.usedSeats);
                    const isFull = remaining <= 0;
                    return (
                      <Tag
                        key={lic.id}
                        icon={<SafetyCertificateOutlined />}
                        color={isFull ? 'error' : 'blue'}
                        style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={`${lic.name} (${remaining}/${lic.totalSeats} seats)`}
                      >
                        {lic.name} ({remaining}/{lic.totalSeats} seats)
                      </Tag>
                    );
                  })}
                  {licenses.length > 15 && (
                    <Tooltip
                      title={licenses
                        .slice(15)
                        .map(
                          (l) =>
                            `${l.name} (${Math.max(0, l.totalSeats - l.usedSeats)}/${l.totalSeats} seats)`,
                        )
                        .join(', ')}
                    >
                      <Tag color="default">
                        +{licenses.length - 15} more item{licenses.length - 15 === 1 ? '' : 's'}
                      </Tag>
                    </Tooltip>
                  )}
                </>
              )}
            </Flex>

            {exhaustedLicenses.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title="Seat Capacity Warning"
                description={`${exhaustedLicenses.length} of the selected licenses currently have 0 available seats. Any license at full capacity will be skipped during allocation.`}
                style={{ marginTop: 12 }}
              />
            )}
          </AppDrawer.Section>

          <AppDrawer.Section title="Target Directory Employee">
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12.5 }}>
                Select an active directory employee who will be granted seats for all selected
                licenses.
              </Text>
              <Select
                showSearch
                allowClear
                loading={loadingEmployees}
                placeholder="Search employee by name, code, or email"
                style={{ width: '100%' }}
                value={selectedUserId}
                onChange={(val) => setSelectedUserId(val)}
                options={employees.map((u) => ({
                  label: formatUserSelectLabel(u),
                  value: u.id,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>

            {selectedUser && (
              <Card
                size="small"
                style={{
                  marginTop: 12,
                  borderColor: token.colorBorderSecondary,
                }}
                styles={{
                  body: {
                    padding: '12px 14px',
                    backgroundColor: token.colorFillAlter,
                  },
                }}
              >
                <Descriptions title="Recipient Employee Details" size="small" column={1}>
                  <Descriptions.Item label="Full Name">
                    <Flex align="center" gap={6}>
                      <UserOutlined style={{ color: token.colorPrimary }} />
                      <Text strong>{formatUserDisplayName(selectedUser)}</Text>
                    </Flex>
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                  {selectedUser.employeeCode && (
                    <Descriptions.Item label="Employee Code">
                      <Tag icon={<IdcardOutlined />} color="purple">
                        {selectedUser.employeeCode}
                      </Tag>
                    </Descriptions.Item>
                  )}
                  {selectedUser.department?.name && (
                    <Descriptions.Item label="Department">
                      {selectedUser.department.name}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}
          </AppDrawer.Section>
        </Flex>
      </AppDrawer>
    );
  },
);

BatchAssignLicensesModal.displayName = 'BatchAssignLicensesModal';
