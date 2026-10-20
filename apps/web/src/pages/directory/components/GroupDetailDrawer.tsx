import {
  CopyOutlined,
  EditOutlined,
  MailOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { DirectoryGroup } from '@uims/shared-types';
import {
  App,
  Badge,
  Button,
  Descriptions,
  Flex,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React from 'react';
import { ActivityTimeline } from '../../../components/ActivityTimeline';
import AppDrawer from '../../../components/AppDrawer';

const { Text } = Typography;

export interface GroupDetailDrawerProps {
  group: DirectoryGroup | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (group: DirectoryGroup) => void;
}

export const GroupDetailDrawer: React.FC<GroupDetailDrawerProps> = ({
  group,
  open,
  onClose,
  onEdit,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  if (!group) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard`);
  };

  const groupEmail = (group as unknown as { email?: string }).email;

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={group.name}
      subtitle={`${group.type || 'Security'} · ${group.scope || 'Global'}`}
      size={560}
      hideFooter={true}
      extra={
        onEdit && (
          <Button type="primary" icon={<EditOutlined />} size="small" onClick={() => onEdit(group)}>
            Edit Group
          </Button>
        )
      }
    >
      <Tabs
        defaultActiveKey="details"
        items={[
          {
            key: 'details',
            label: 'Group Details',
            children: (
              <div>
                <AppDrawer.Section title="Group Information">
                  <Descriptions column={1} bordered size="small">
                    {groupEmail && (
                      <Descriptions.Item label="Distribution Email">
                        <Flex align="center" gap={6}>
                          <MailOutlined style={{ color: token.colorTextTertiary }} />
                          <Text copyable={{ text: groupEmail }}>{groupEmail}</Text>
                          <Tooltip title="Copy distribution email">
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined style={{ fontSize: 11 }} />}
                              onClick={() => copyToClipboard(groupEmail, 'Distribution email')}
                            />
                          </Tooltip>
                        </Flex>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Managed By">
                      <Flex align="center" gap={6}>
                        <UserOutlined style={{ color: token.colorTextTertiary }} />
                        <Text strong>{group.managedBy || 'Unassigned'}</Text>
                      </Flex>
                    </Descriptions.Item>
                    <Descriptions.Item label="Active Members">
                      <Badge
                        count={`${group.memberCount ?? 0} members`}
                        style={{ backgroundColor: '#10b981' }}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="Created At">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(group.createdAt).toLocaleDateString()}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </AppDrawer.Section>

                <AppDrawer.Section title="Description">
                  {group.description ? (
                    <Text style={{ fontSize: 13, lineHeight: '20px' }}>{group.description}</Text>
                  ) : (
                    <Text type="secondary" italic>
                      No description provided.
                    </Text>
                  )}
                </AppDrawer.Section>

                <AppDrawer.Section title="Active Directory & Security Policy">
                  <Flex vertical gap={8} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      This group is managed within Active Directory topology. Members automatically
                      inherit assigned security permissions, file share ACLs, and distribution list
                      subscriptions.
                    </Text>
                    <div>
                      <Tag color="geekblue" icon={<TeamOutlined />}>
                        Domain Synchronized
                      </Tag>
                    </div>
                  </Flex>
                </AppDrawer.Section>
              </div>
            ),
          },
          {
            key: 'history',
            label: 'Group History',
            children: <ActivityTimeline entityType="Group" entityId={group.id} />,
          },
        ]}
      />
    </AppDrawer>
  );
};
