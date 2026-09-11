import { IdcardOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Card, Descriptions, Flex, Modal, Select, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import type { License } from '../../../services/licenses.service';

const { Text } = Typography;

export interface LicenseAssignmentModalProps {
  open: boolean;
  license: License | null;
  submitting: boolean;
  onAssign: (user: DirectoryUser) => void;
  onCancel: () => void;
  employees?: DirectoryUser[]; // For test isolation
}

export const LicenseAssignmentModal: React.FC<LicenseAssignmentModalProps> = React.memo(
  ({ open, license, submitting, onAssign, onCancel, employees: propEmployees }) => {
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

    if (!license) return null;

    const remainingSeats = Math.max(0, license.totalSeats - license.usedSeats);
    const isExhausted = remainingSeats <= 0;
    const selectedUser = employees.find((u) => u.id === selectedUserId) || null;

    // Filter out users already assigned to this license
    const assignedUserEmails = new Set(
      (license.assignedUsers || []).map((u) => (u.email || '').toLowerCase()),
    );
    const availableEmployees = employees.filter(
      (u) => !assignedUserEmails.has((u.email || '').toLowerCase()),
    );

    const handleOk = () => {
      if (!selectedUser || isExhausted) return;
      onAssign(selectedUser);
    };

    return (
      <Modal
        title={`Assign Seat: ${license.name}`}
        open={open}
        onOk={handleOk}
        onCancel={onCancel}
        confirmLoading={submitting}
        okText="Assign Seat"
        okButtonProps={{ disabled: !selectedUser || isExhausted }}
        destroyOnHidden
        width={540}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Flex vertical gap={14}>
          <Flex justify="space-between" align="center">
            <Text type="secondary">Remaining Seats:</Text>
            <Tag color={isExhausted ? 'error' : remainingSeats < 3 ? 'warning' : 'success'}>
              {remainingSeats} of {license.totalSeats} seats available
            </Tag>
          </Flex>

          {isExhausted && (
            <Alert
              type="error"
              showIcon
              message="Seat Capacity Reached"
              description="All seats for this license are currently assigned. Revoke inactive users or expand license seat quota before assigning new users."
            />
          )}

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Select Directory Employee
            </Text>
            <Select
              showSearch
              allowClear
              disabled={isExhausted}
              loading={loadingEmployees}
              placeholder="Search employee by name, code, or email"
              style={{ width: '100%' }}
              value={selectedUserId}
              onChange={(val) => setSelectedUserId(val)}
              options={availableEmployees.map((u) => ({
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
              <Descriptions title="Employee Preview" size="small" column={1}>
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

LicenseAssignmentModal.displayName = 'LicenseAssignmentModal';
