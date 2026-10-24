import {
  DisconnectOutlined,
  DownloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { DoorAccessAssignmentDto, UserAccessDetailDto } from '@uims/shared-types';
import { App, Badge, Button, Descriptions, Empty, Space, Table, Tabs, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { AppDrawer } from '../../../components/AppDrawer';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { UserDrawerState } from '../types/access-control.types';
import {
  downloadBlobFile,
  formatDate,
  getSecurityLevelColor,
  getSubjectTypeTag,
} from '../utils/access-control.utils';

interface UserAccessDetailDrawerProps {
  state: UserDrawerState;
  onClose: () => void;
  onGrantAccess: (subjectType: string, subjectId: string) => void;
  onRevokeAccess: (assignmentId: string) => void;
  onPreviewScan: (documentId: string) => void;
}

export const UserAccessDetailDrawer: React.FC<UserAccessDetailDrawerProps> = ({
  state,
  onClose,
  onGrantAccess,
  onRevokeAccess,
  onPreviewScan,
}) => {
  const { message } = App.useApp();
  const [userProfile, setUserProfile] = useState<UserAccessDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (state.open && state.subjectType && state.subjectId) {
      setLoading(true);
      accessControlService
        .getUserAccessDetail(state.subjectType, state.subjectId)
        .then((res) => {
          setUserProfile(res);
        })
        .catch((err: unknown) => {
          message.error(formatErrorMessage(err, 'load user door clearance profile'));
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setUserProfile(null);
    }
  }, [state.open, state.subjectType, state.subjectId, message]);

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

  const activeColumns: ColumnsType<DoorAccessAssignmentDto> = [
    {
      title: 'Target Door',
      key: 'door',
      render: (_, record) => (
        <Space vertical size={2}>
          <Space>
            <Tag color="cyan" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {record.door?.doorCode || 'DOOR'}
            </Tag>
            <span style={{ fontWeight: 600 }}>{record.door?.name}</span>
          </Space>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {record.door?.building}, Floor {record.door?.floor} ({record.door?.location || 'Zone'})
          </span>
        </Space>
      ),
    },
    {
      title: 'Security Level',
      key: 'security',
      width: 120,
      render: (_, record) => (
        <Tag color={getSecurityLevelColor(record.door?.securityLevel)}>
          {record.door?.securityLevel || 'STANDARD'}
        </Tag>
      ),
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
      title: 'Approval Scan',
      key: 'scan',
      width: 130,
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
            <Tooltip title="Download grant scan">
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
        <Tooltip title="Revoke clearance for this door">
          <Button
            size="small"
            danger
            icon={<DisconnectOutlined />}
            onClick={() => onRevokeAccess(record.id)}
          >
            Revoke
          </Button>
        </Tooltip>
      ),
    },
  ];

  const revokedColumns: ColumnsType<DoorAccessAssignmentDto> = [
    {
      title: 'Door',
      key: 'door',
      render: (_, record) => (
        <Space vertical size={2}>
          <Space>
            <Tag color="cyan" style={{ fontFamily: 'monospace' }}>
              {record.door?.doorCode}
            </Tag>
            <span>{record.door?.name}</span>
          </Space>
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
      title: 'Reason',
      dataIndex: 'revocationReason',
      key: 'reason',
      render: (val: string) => val || 'N/A',
    },
    {
      title: 'Revocation Scan',
      key: 'scan',
      width: 130,
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
            <Tooltip title="Download revocation scan">
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

  const subjectTag = userProfile ? getSubjectTypeTag(userProfile.subjectType) : null;

  return (
    <AppDrawer
      open={state.open}
      onClose={onClose}
      title={userProfile?.fullName || 'User Access Profile'}
      subtitle={userProfile ? `Badge / ID: ${userProfile.codeOrBadge}` : undefined}
      icon={<UserOutlined />}
      size={740}
      hideFooter
      extra={
        userProfile && (
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() => onGrantAccess(userProfile.subjectType, userProfile.subjectId)}
          >
            Grant Door Clearance
          </Button>
        )
      }
    >
      {userProfile ? (
        <div>
          <AppDrawer.Section title="Personnel Profile">
            <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Full Name">
                <Space>
                  <span style={{ fontWeight: 600 }}>{userProfile.fullName}</span>
                  {subjectTag && <Tag color={subjectTag.color}>{subjectTag.label}</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Code / Badge #">
                <strong style={{ fontFamily: 'monospace' }}>{userProfile.codeOrBadge}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Organization / Company">
                {userProfile.organizationOrCompany}
              </Descriptions.Item>
              <Descriptions.Item label="Department / Role">
                {userProfile.departmentOrTitle || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Email Address">
                {userProfile.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone Number">
                {userProfile.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Tag color={userProfile.status === 'ACTIVE' ? 'success' : 'default'}>
                  {userProfile.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Active Clearances">
                <Badge count={userProfile.activeAssignments.length} showZero color="#10b981" />
              </Descriptions.Item>
            </Descriptions>
          </AppDrawer.Section>

          <AppDrawer.Section title="Physical Door Clearances & History" noCard>
            <Tabs
              defaultActiveKey="active"
              items={[
                {
                  key: 'active',
                  label: `Authorized Doors (${userProfile.activeAssignments.length})`,
                  children: (
                    <Table
                      dataSource={userProfile.activeAssignments}
                      columns={activeColumns}
                      rowKey="id"
                      size="small"
                      loading={loading}
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No authorized doors currently assigned to this user."
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'revoked',
                  label: `Revocation History (${userProfile.revokedAssignments.length})`,
                  children: (
                    <Table
                      dataSource={userProfile.revokedAssignments}
                      columns={revokedColumns}
                      rowKey="id"
                      size="small"
                      loading={loading}
                      pagination={{ pageSize: 5, showSizeChanger: false }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No revoked door access records for this user."
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
        <Empty description="No user profile loaded" />
      )}
    </AppDrawer>
  );
};
