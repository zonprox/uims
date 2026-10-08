import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Empty, Flex, Popconfirm, Tag, Typography, theme } from 'antd';
import React from 'react';
import AppDrawer from '../../../components/AppDrawer';
import type { License } from '../../../services/licenses.service';

const { Text } = Typography;

export interface LicenseSeatsDrawerProps {
  open: boolean;
  license: License | null;
  onClose: () => void;
  onOpenAssignModal: () => void;
  onRevokeSeat: (assignmentId: string) => void;
}

export const LicenseSeatsDrawer: React.FC<LicenseSeatsDrawerProps> = React.memo(
  ({ open, license, onClose, onOpenAssignModal, onRevokeSeat }) => {
    const { token } = theme.useToken();
    if (!license) return null;

    const remainingSeats = Math.max(0, license.totalSeats - license.usedSeats);
    const isExhausted = remainingSeats <= 0;

    return (
      <AppDrawer
        title={license.name}
        subtitle={`${license.usedSeats} of ${license.totalSeats} seats allocated (${remainingSeats} available)`}
        tag={isExhausted ? <Tag color="error">Full</Tag> : undefined}
        open={open}
        onClose={onClose}
        size={520}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            disabled={isExhausted}
            onClick={onOpenAssignModal}
          >
            Assign User
          </Button>
        }
        cancelText="Close"
      >
        <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13 }}>
            Active Allocations ({license.assignedUsers?.length || 0})
          </Text>
          {isExhausted && <Tag color="error">Capacity Reached</Tag>}
        </Flex>

        {!license.assignedUsers || license.assignedUsers.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No users assigned to this license."
            style={{ margin: '32px 0' }}
          />
        ) : (
          <Flex vertical gap={10}>
            {license.assignedUsers.map((user) => (
              <Flex
                key={user.id}
                justify="space-between"
                align="center"
                style={{
                  padding: '10px 14px',
                  borderRadius: token.borderRadiusSM,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  backgroundColor: token.colorFillAlter,
                }}
              >
                <Flex align="center" gap={12}>
                  <Avatar
                    icon={<UserOutlined />}
                    style={{ backgroundColor: token.colorPrimary, fontSize: 12 }}
                    size="default"
                  />
                  <div>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>
                        {user.name}
                      </Text>
                      {user.department && (
                        <Tag color="cyan" style={{ marginLeft: 8, fontSize: 10 }}>
                          {user.department}
                        </Tag>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      {user.email}
                    </Text>
                    <div style={{ fontSize: 10.5, color: token.colorTextTertiary }}>
                      Assigned: {user.assignedDate}
                    </div>
                  </div>
                </Flex>
                <Popconfirm
                  title="Revoke license seat?"
                  description="This user will lose access to this software license."
                  onConfirm={() => onRevokeSeat(user.id)}
                  okText="Revoke"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="link" danger size="small">
                    Revoke
                  </Button>
                </Popconfirm>
              </Flex>
            ))}
          </Flex>
        )}
      </AppDrawer>
    );
  },
);

LicenseSeatsDrawer.displayName = 'LicenseSeatsDrawer';
