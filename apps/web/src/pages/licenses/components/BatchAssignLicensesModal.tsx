import {
  IdcardOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Card,
  Descriptions,
  Divider,
  Flex,
  Modal,
  Select,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import type { License } from '../../../services/licenses.service';

const { Text } = Typography;

export interface BatchAssignLicensesModalProps {
  open: boolean;
  licenses: License[];
  submitting: boolean;
  onAssign: (userId: string) => void;
  onCancel: () => void;
  employees?: DirectoryUser[]; // For test isolation
}

export const BatchAssignLicensesModal: React.FC<BatchAssignLicensesModalProps> = React.memo(
  ({ open, licenses, submitting, onAssign, onCancel, employees: propEmployees }) => {
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
      if (!open) {
        setSelectedUserId(null);
        return;
      }

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
        } catch (_error: unknown) {
          // Handled gracefully
        } finally {
          if (mounted) setLoadingEmployees(false);
        }
      };

      loadEmployees();

      return () => {
        mounted = false;
      };
    }, [open, propEmployees]);

    const selectedUser = useMemo(
      () => employees.find((u) => u.id === selectedUserId) || null,
      [employees, selectedUserId],
    );

    const count = licenses.length;
    const exhaustedLicenses = useMemo(
      () => licenses.filter((l) => Math.max(0, l.totalSeats - l.usedSeats) <= 0),
      [licenses],
    );

    const handleOk = () => {
      if (!selectedUserId) return;
      onAssign(selectedUserId);
    };

    return (
      <Modal
        title={
          <Flex align="center" gap={8}>
            <UserSwitchOutlined style={{ color: '#1677ff' }} />
            <span>Batch Assign Software Licenses</span>
          </Flex>
        }
        open={open}
        onOk={handleOk}
        onCancel={onCancel}
        confirmLoading={submitting}
        okText={`Assign ${count} License${count > 1 ? 's' : ''}`}
        okButtonProps={{ disabled: !selectedUserId || count === 0 }}
        destroyOnHidden
        width={580}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Flex vertical gap={14}>
          <Flex
            justify="space-between"
            align="center"
            style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <Flex align="center" gap={8}>
              <Badge count={count} overflowCount={9999} style={{ backgroundColor: '#1677ff' }} />
              <Text strong style={{ fontSize: 13 }}>
                Selected Software Licenses
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {count} license{count > 1 ? 's' : ''} to assign
            </Text>
          </Flex>

          <Flex wrap gap={6} style={{ maxHeight: 84, overflowY: 'auto', padding: '2px 0' }}>
            {licenses.map((lic) => {
              const remaining = Math.max(0, lic.totalSeats - lic.usedSeats);
              const isFull = remaining <= 0;
              return (
                <Tag
                  key={lic.id}
                  icon={<SafetyCertificateOutlined />}
                  color={isFull ? 'error' : 'blue'}
                >
                  {lic.name} ({remaining}/{lic.totalSeats} seats)
                </Tag>
              );
            })}
          </Flex>

          {exhaustedLicenses.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title="Seat Capacity Warning"
              description={`${exhaustedLicenses.length} of the selected licenses currently have 0 available seats. Any license at full capacity will be skipped during allocation.`}
            />
          )}

          <Divider style={{ margin: '4px 0' }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Target Directory Employee
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
                label: `${u.fullName || `${u.firstName} ${u.lastName}`.trim()} (${u.employeeCode || u.email})`,
                value: u.id,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          {selectedUser && (
            <Card size="small" style={{ backgroundColor: '#f8fafc' }}>
              <Descriptions title="Recipient Employee Details" size="small" column={1}>
                <Descriptions.Item label="Full Name">
                  <Flex align="center" gap={6}>
                    <UserOutlined style={{ color: '#1677ff' }} />
                    <Text strong>
                      {selectedUser.fullName ||
                        `${selectedUser.firstName} ${selectedUser.lastName}`}
                    </Text>
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
        </Flex>
      </Modal>
    );
  },
);

BatchAssignLicensesModal.displayName = 'BatchAssignLicensesModal';
