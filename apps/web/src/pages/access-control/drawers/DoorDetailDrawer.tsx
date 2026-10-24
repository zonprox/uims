import {
  DisconnectOutlined,
  DownloadOutlined,
  EyeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  AccessAssignmentStatus,
  type DoorDetailDto,
  type DoorUserAssignmentDto,
} from '@uims/shared-types';
import { App, Badge, Button, Descriptions, Empty, Space, Table, Tabs, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { AppDrawer } from '../../../components/AppDrawer';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { DoorDrawerState } from '../types/access-control.types';
import {
  downloadBlobFile,
  formatDate,
  getDoorStatusColor,
  getSecurityLevelColor,
  getSubjectTypeTag,
} from '../utils/access-control.utils';

interface DoorDetailDrawerProps {
  state: DoorDrawerState;
  onClose: () => void;
  onGrantAccess: (doorId: string) => void;
  onRevokeAccess: (assignmentId: string) => void;
  onPreviewScan: (documentId: string) => void;
}

export const DoorDetailDrawer: React.FC<DoorDetailDrawerProps> = ({
  state,
  onClose,
  onGrantAccess,
  onRevokeAccess,
  onPreviewScan,
}) => {
  const { message } = App.useApp();
  const [door, setDoor] = useState<DoorDetailDto | null>(null);
  const [activeUsers, setActiveUsers] = useState<DoorUserAssignmentDto[]>([]);
  const [revokedUsers, setRevokedUsers] = useState<DoorUserAssignmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (state.open && state.doorId) {
      setLoading(true);
      Promise.all([
        accessControlService.getDoorById(state.doorId),
        accessControlService.getDoorUsers(state.doorId, {
          status: AccessAssignmentStatus.ACTIVE,
          pageSize: 100,
        }),
        accessControlService.getDoorUsers(state.doorId, {
          status: AccessAssignmentStatus.REVOKED,
          pageSize: 100,
        }),
      ])
        .then(([doorRes, activeRes, revokedRes]) => {
          setDoor(doorRes);
          setActiveUsers(activeRes.items);
          setRevokedUsers(revokedRes.items);
        })
        .catch((err: unknown) => {
          message.error(formatErrorMessage(err, 'load door details and user clearances'));
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDoor(null);
      setActiveUsers([]);
      setRevokedUsers([]);
    }
  }, [state.open, state.doorId, message]);

  const handleDownloadDoc = async (documentId: string) => {
    try {
      setDownloadingDocId(documentId);
      const { blob, filename } = await accessControlService.downloadDocumentBlob(documentId);
      downloadBlobFile(blob, filename);
      message.success('Document scan downloaded.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'download document scan'));
    } finally {
      setDownloadingDocId(null);
    }
  };

  const activeColumns: ColumnsType<DoorUserAssignmentDto> = [
    {
      title: 'Authorized User',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name: string, record) => {
        const tag = getSubjectTypeTag(record.subjectType);
        return (
          <Space vertical size={2}>
            <Space>
              <span style={{ fontWeight: 600 }}>{name}</span>
              <Tag color={tag.color} style={{ fontSize: 11, lineHeight: '18px' }}>
                {tag.label}
              </Tag>
            </Space>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Badge: {record.codeOrBadge} • {record.organizationOrCompany}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Validity Window',
      key: 'validity',
      render: (_, record) => (
        <Space vertical size={2} style={{ fontSize: 12 }}>
          <span>
            From: <strong>{formatDate(record.validFrom)}</strong>
          </span>
          <span>
            To:{' '}
            <strong>
              {record.accessType === 'PERMANENT' ? 'Permanent' : formatDate(record.validTo)}
            </strong>
          </span>
        </Space>
      ),
    },
    {
      title: 'Scan Document',
      key: 'scan',
      width: 140,
      render: (_, record) => {
        if (!record.grantDocumentId) {
          return <span style={{ color: '#94a3b8', fontSize: 12 }}>No scan</span>;
        }
        return (
          <Space size={4}>
            <Tooltip title="Preview signed grant scan">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onPreviewScan(record.grantDocumentId!)}
              />
            </Tooltip>
            <Tooltip title="Download scan file">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={downloadingDocId === record.grantDocumentId}
                onClick={() => handleDownloadDoc(record.grantDocumentId!)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Tooltip title="Revoke access clearance for this user">
          <Button
            size="small"
            danger
            icon={<DisconnectOutlined />}
            onClick={() => onRevokeAccess(record.assignmentId)}
          >
            Revoke
          </Button>
        </Tooltip>
      ),
    },
  ];

  const revokedColumns: ColumnsType<DoorUserAssignmentDto> = [
    {
      title: 'User',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name: string, record) => (
        <Space vertical size={2}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {record.codeOrBadge} • {record.organizationOrCompany}
          </span>
        </Space>
      ),
    },
    {
      title: 'Revocation Date',
      dataIndex: 'revokedAt',
      key: 'revokedAt',
      render: (val: string) => formatDate(val),
    },
    {
      title: 'Revocation Scan',
      key: 'scan',
      width: 140,
      render: (_, record) => {
        if (!record.revocationDocumentId) {
          return <span style={{ color: '#94a3b8', fontSize: 12 }}>No scan</span>;
        }
        return (
          <Space size={4}>
            <Tooltip title="Preview signed revocation scan">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onPreviewScan(record.revocationDocumentId!)}
              />
            </Tooltip>
            <Tooltip title="Download revocation scan file">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={downloadingDocId === record.revocationDocumentId}
                onClick={() => handleDownloadDoc(record.revocationDocumentId!)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <AppDrawer
      open={state.open}
      onClose={onClose}
      title={door?.name || 'Door Details'}
      subtitle={door ? `Door Code: ${door.doorCode}` : undefined}
      icon={<KeyOutlined />}
      size={720}
      hideFooter
      extra={
        door && (
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() => onGrantAccess(door.id)}
          >
            Grant Access
          </Button>
        )
      }
    >
      {door ? (
        <div>
          <AppDrawer.Section title="Door Specifications">
            <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Door Code">
                <Tag color="cyan" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {door.doorCode}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Security Level">
                <Tag color={getSecurityLevelColor(door.securityLevel)}>{door.securityLevel}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Operational Status">
                <Tag color={getDoorStatusColor(door.status)}>{door.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Active Clearances">
                <Badge count={door.activeUsersCount} showZero color="#10b981" />
              </Descriptions.Item>
              <Descriptions.Item label="Building">{door.building}</Descriptions.Item>
              <Descriptions.Item label="Floor">{door.floor}</Descriptions.Item>
              <Descriptions.Item label="Zone / Sector">{door.zone || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Room Location">{door.location || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Controller Model">
                {door.controllerModel || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Controller IP">
                {door.controllerIp || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Reader Type">{door.readerType || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Reader ID">{door.readerId || 'N/A'}</Descriptions.Item>
              {door.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {door.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </AppDrawer.Section>

          <AppDrawer.Section title="Authorized Access & History" noCard>
            <Tabs
              defaultActiveKey="active"
              items={[
                {
                  key: 'active',
                  label: `Active Authorized Users (${activeUsers.length})`,
                  children: (
                    <Table
                      dataSource={activeUsers}
                      columns={activeColumns}
                      rowKey="assignmentId"
                      size="small"
                      loading={loading}
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No users currently authorized for this door."
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'revoked',
                  label: `Revocation History (${revokedUsers.length})`,
                  children: (
                    <Table
                      dataSource={revokedUsers}
                      columns={revokedColumns}
                      rowKey="assignmentId"
                      size="small"
                      loading={loading}
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No revoked access records for this door."
                          />
                        ),
                      }}
                    />
                  ),
                },
              ]}
            />
          </AppDrawer.Section>
        </div>
      ) : (
        <Empty description="No door selected" />
      )}
    </AppDrawer>
  );
};
