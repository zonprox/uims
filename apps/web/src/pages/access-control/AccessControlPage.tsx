import {
  CheckCircleOutlined,
  DisconnectOutlined,
  FileTextOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { AccessControlStatsDto } from '@uims/shared-types';
import { AccessSubjectType } from '@uims/shared-types';
import { App, Button, Space, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { accessControlService } from '../../services/access-control.service';
import { formatErrorMessage } from '../../utils/feedback';
import { DoorDetailDrawer } from './drawers/DoorDetailDrawer';
import { UserAccessDetailDrawer } from './drawers/UserAccessDetailDrawer';
import { DocumentPreviewModal } from './modals/DocumentPreviewModal';
import { DoorModal } from './modals/DoorModal';
import { GrantAccessModal } from './modals/GrantAccessModal';
import { NonAdUserModal } from './modals/NonAdUserModal';
import { RevokeAccessModal } from './modals/RevokeAccessModal';
import { DocumentsTab } from './tabs/DocumentsTab';
import { DoorsTab } from './tabs/DoorsTab';
import { UsersMatrixTab } from './tabs/UsersMatrixTab';
import type {
  AccessControlTabKey,
  DoorDrawerState,
  DoorModalState,
  GrantModalState,
  NonAdUserModalState,
  PreviewModalState,
  RevokeModalState,
  UserDrawerState,
} from './types/access-control.types';

export default function AccessControlPage() {
  const { message } = App.useApp();

  // Telemetry KPIs
  const [stats, setStats] = useState<AccessControlStatsDto | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Active Tab
  const [activeTabKey, setActiveTabKey] = useState<AccessControlTabKey>('doors');

  // Modals & Drawers State
  const [doorModal, setDoorModal] = useState<DoorModalState>({
    open: false,
    mode: 'create',
  });

  const [nonAdUserModal, setNonAdUserModal] = useState<NonAdUserModalState>({
    open: false,
    mode: 'create',
  });

  const [grantModal, setGrantModal] = useState<GrantModalState>({
    open: false,
  });

  const [revokeModal, setRevokeModal] = useState<RevokeModalState>({
    open: false,
  });

  const [doorDrawer, setDoorDrawer] = useState<DoorDrawerState>({
    open: false,
  });

  const [userDrawer, setUserDrawer] = useState<UserDrawerState>({
    open: false,
  });

  const [previewModal, setPreviewModal] = useState<PreviewModalState>({
    open: false,
  });

  const loadStats = useCallback(async () => {
    try {
      const data = await accessControlService.getStats();
      setStats(data);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load access control telemetry'));
    }
  }, [message]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

  const handleMutationSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <PageContainer
      title="Access Control"
      subtitle="Manage physical doors, authorized user access, validity windows, and approval scan documents."
      breadcrumbs={[{ title: 'Access Control' }]}
      stats={[
        {
          title: 'Total Doors',
          value: stats?.totalDoors ?? 0,
          prefix: <KeyOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Doors',
          value: stats?.activeDoors ?? 0,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Registered Users',
          value: (stats?.totalNonADUsers ?? 0) + (stats?.directoryUserAssignments ?? 0),
          prefix: <TeamOutlined />,
          color: '#8b5cf6',
        },
        {
          title: 'Active Access Grants',
          value: stats?.totalActiveAssignments ?? 0,
          prefix: <SafetyCertificateOutlined />,
          color: '#f59e0b',
        },
      ]}
      extra={
        <Space wrap>
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() => setGrantModal({ open: true })}
          >
            Grant Access
          </Button>
          <Button
            danger
            icon={<DisconnectOutlined />}
            onClick={() => setRevokeModal({ open: true })}
          >
            Revoke Access
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setDoorModal({ open: true, mode: 'create' })}
          >
            Add Door
          </Button>
          <Button
            icon={<UserAddOutlined />}
            onClick={() => setNonAdUserModal({ open: true, mode: 'create' })}
          >
            Add External User
          </Button>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTabKey}
        onChange={(k) => setActiveTabKey(k as AccessControlTabKey)}
        items={[
          {
            key: 'doors',
            icon: <KeyOutlined />,
            label: `Doors (${stats?.totalDoors ?? 0})`,
            children: (
              <DoorsTab
                refreshTrigger={refreshTrigger}
                onOpenDoorDrawer={(doorId) => setDoorDrawer({ open: true, doorId })}
                onEditDoor={(door) => setDoorModal({ open: true, mode: 'edit', door })}
                onAddDoor={() => setDoorModal({ open: true, mode: 'create' })}
                onGrantDoor={(doorId) =>
                  setGrantModal({ open: true, preselectedDoorIds: [doorId] })
                }
              />
            ),
          },
          {
            key: 'users',
            icon: <TeamOutlined />,
            label: 'Users & Access Matrix',
            children: (
              <UsersMatrixTab
                refreshTrigger={refreshTrigger}
                onOpenUserDrawer={(subjectType, subjectId) =>
                  setUserDrawer({
                    open: true,
                    subjectType: subjectType as AccessSubjectType,
                    subjectId,
                  })
                }
                onQuickGrant={(subjectType, subjectId) =>
                  setGrantModal({
                    open: true,
                    preselectedSubjectType: subjectType as AccessSubjectType,
                    preselectedSubjectIds: [subjectId],
                  })
                }
                onAddNonAdUser={() => setNonAdUserModal({ open: true, mode: 'create' })}
                onEditNonAdUser={(user) => setNonAdUserModal({ open: true, mode: 'edit', user })}
              />
            ),
          },
          {
            key: 'documents',
            icon: <FileTextOutlined />,
            label: 'Approval Documents & Scans',
            children: (
              <DocumentsTab
                refreshTrigger={refreshTrigger}
                onPreview={(documentId) => setPreviewModal({ open: true, documentId })}
              />
            ),
          },
        ]}
      />

      {/* Action Modals */}
      <DoorModal
        state={doorModal}
        onClose={() => setDoorModal({ open: false, mode: 'create' })}
        onSuccess={handleMutationSuccess}
      />

      <NonAdUserModal
        state={nonAdUserModal}
        onClose={() => setNonAdUserModal({ open: false, mode: 'create' })}
        onSuccess={handleMutationSuccess}
      />

      <GrantAccessModal
        state={grantModal}
        onClose={() => setGrantModal({ open: false })}
        onSuccess={handleMutationSuccess}
      />

      <RevokeAccessModal
        state={revokeModal}
        onClose={() => setRevokeModal({ open: false })}
        onSuccess={handleMutationSuccess}
      />

      {/* Inspection Drawers */}
      <DoorDetailDrawer
        state={doorDrawer}
        onClose={() => setDoorDrawer({ open: false })}
        onGrantAccess={(doorId) => setGrantModal({ open: true, preselectedDoorIds: [doorId] })}
        onRevokeAccess={(assignmentId) =>
          setRevokeModal({ open: true, preselectedAssignmentIds: [assignmentId] })
        }
        onPreviewScan={(documentId) => setPreviewModal({ open: true, documentId })}
      />

      <UserAccessDetailDrawer
        state={userDrawer}
        onClose={() => setUserDrawer({ open: false })}
        onGrantAccess={(subjectType, subjectId) =>
          setGrantModal({
            open: true,
            preselectedSubjectType: subjectType as AccessSubjectType,
            preselectedSubjectIds: [subjectId],
          })
        }
        onRevokeAccess={(assignmentId) =>
          setRevokeModal({ open: true, preselectedAssignmentIds: [assignmentId] })
        }
        onPreviewScan={(documentId) => setPreviewModal({ open: true, documentId })}
      />

      {/* Document Scan Preview Modal */}
      <DocumentPreviewModal state={previewModal} onClose={() => setPreviewModal({ open: false })} />
    </PageContainer>
  );
}
