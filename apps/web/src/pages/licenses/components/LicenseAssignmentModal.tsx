import { IdcardOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Avatar, Card, Descriptions, Flex, Modal, Select, Tag, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import type { License } from '../../../services/licenses.service';

const { Text } = Typography;

export interface LicenseAssignmentModalProps {
  open: boolean;
  license: License | null;
  submitting: boolean;
  onAssign?: (user: DirectoryUser) => void;
  onBatchAssign?: (users: DirectoryUser[]) => void;
  onCancel: () => void;
  employees?: DirectoryUser[]; // For test isolation
}

export const LicenseAssignmentModal: React.FC<LicenseAssignmentModalProps> = React.memo(
  ({ open, license, submitting, onAssign, onBatchAssign, onCancel, employees: propEmployees }) => {
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    useEffect(() => {
      if (!open) {
        setSelectedUserIds([]);
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

    const selectedUsers = useMemo(
      () => employees.filter((u) => selectedUserIds.includes(u.id)),
      [employees, selectedUserIds],
    );

    const assignedUserEmails = useMemo(
      () => new Set((license?.assignedUsers || []).map((u) => (u.email || '').toLowerCase())),
      [license?.assignedUsers],
    );

    const availableEmployees = useMemo(
      () => employees.filter((u) => !assignedUserEmails.has((u.email || '').toLowerCase())),
      [employees, assignedUserEmails],
    );

    if (!license) return null;

    const remainingSeats = Math.max(0, license.totalSeats - license.usedSeats);
    const isExhausted = remainingSeats <= 0;

    const handleOk = () => {
      if (selectedUsers.length === 0 || isExhausted) return;
      if (selectedUsers.length === 1 && onAssign) {
        onAssign(selectedUsers[0]);
      } else if (onBatchAssign) {
        onBatchAssign(selectedUsers);
      } else if (onAssign) {
        onAssign(selectedUsers[0]);
      }
    };

    const count = selectedUserIds.length;

    return (
      <Modal
        title={`Assign Seat: ${license.name}`}
        open={open}
        onOk={handleOk}
        onCancel={onCancel}
        confirmLoading={submitting}
        okText={count > 1 ? `Assign ${count} Seats` : 'Assign Seat'}
        okButtonProps={{ disabled: count === 0 || isExhausted }}
        destroyOnHidden
        width={540}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Flex vertical gap={14}>
          <Flex justify="space-between" align="center">
            <Text type="secondary">Remaining Capacity:</Text>
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
              Select Directory Employee(s)
            </Text>
            <Select
              mode="multiple"
              showSearch
              allowClear
              maxCount={remainingSeats > 0 ? remainingSeats : undefined}
              disabled={isExhausted}
              loading={loadingEmployees}
              placeholder="Search and select one or more employees"
              style={{ width: '100%' }}
              value={selectedUserIds}
              onChange={(val) => setSelectedUserIds(val)}
              options={availableEmployees.map((u) => ({
                label: `${u.fullName || `${u.firstName} ${u.lastName}`.trim()} (${u.employeeCode || u.email})`,
                value: u.id,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          {selectedUsers.length === 1 && (
            <Card size="small" style={{ backgroundColor: '#f8fafc' }}>
              <Descriptions title="Employee Preview" size="small" column={1}>
                <Descriptions.Item label="Full Name">
                  <Flex align="center" gap={6}>
                    <UserOutlined style={{ color: '#1677ff' }} />
                    <Text strong>
                      {selectedUsers[0].fullName ||
                        `${selectedUsers[0].firstName} ${selectedUsers[0].lastName}`}
                    </Text>
                  </Flex>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{selectedUsers[0].email}</Descriptions.Item>
                {selectedUsers[0].employeeCode && (
                  <Descriptions.Item label="Employee Code">
                    <Tag icon={<IdcardOutlined />} color="purple">
                      {selectedUsers[0].employeeCode}
                    </Tag>
                  </Descriptions.Item>
                )}
                {selectedUsers[0].department?.name && (
                  <Descriptions.Item label="Department">
                    {selectedUsers[0].department.name}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {selectedUsers.length > 1 && (
            <Card size="small" style={{ backgroundColor: '#f8fafc' }}>
              <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 12 }}>
                  Selected Recipients ({count} of max {remainingSeats} available):
                </Text>
                <Flex wrap gap={6} style={{ maxHeight: 100, overflowY: 'auto' }}>
                  {selectedUsers.map((u) => (
                    <Tag
                      key={u.id}
                      icon={<Avatar size={16} icon={<UserOutlined />} />}
                      color="blue"
                    >
                      {u.fullName || `${u.firstName} ${u.lastName}`.trim()}
                    </Tag>
                  ))}
                </Flex>
              </Flex>
            </Card>
          )}
        </Flex>
      </Modal>
    );
  },
);

LicenseAssignmentModal.displayName = 'LicenseAssignmentModal';
