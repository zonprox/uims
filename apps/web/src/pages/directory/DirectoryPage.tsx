import {
  BranchesOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  DesktopOutlined,
  DownloadOutlined,
  PlusOutlined,
  ShareAltOutlined,
  SyncOutlined,
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type {
  DirectoryGroup,
  DirectorySummaryStats,
  DirectoryUser,
  DomainSyncResult,
  OrganizationalUnit,
} from '@uims/shared-types';
import { Alert, App, Button, Flex, Tabs, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { directoryService } from '../../services/directory.service';
import { OrganizationalUnitsTab } from '../users/components/OrganizationalUnitsTab';
import { DirectoryGroupsTab } from './DirectoryGroupsTab';
import { EmployeesTab } from './EmployeesTab';

const { Text } = Typography;

export default function DirectoryPage() {
  const { message } = App.useApp();

  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([]);
  const [stats, setStats] = useState<DirectorySummaryStats | null>(null);
  const [syncResult, setSyncResult] = useState<DomainSyncResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('employees');
  const [ouFilter, setOuFilter] = useState('all');

  // Modal triggers
  const [createEmployeeModalOpen, setCreateEmployeeModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, groupsRes, ousRes, statsRes] = await Promise.all([
        directoryService.getEmployees({ limit: 100 }),
        directoryService.getGroups().catch(() => []),
        directoryService.getOrganizationalUnits().catch(() => []),
        directoryService.getStats().catch(() => null),
      ]);

      const items = Array.isArray(empRes) ? empRes : empRes.items || [];
      setEmployees(items);
      setGroups(groupsRes || []);
      setOrganizationalUnits(ousRes || []);
      setStats(statsRes);
    } catch {
      message.error('Failed to load corporate directory records.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncDomain = async () => {
    setSyncing(true);
    try {
      const result = await directoryService.syncDomain();
      setSyncResult(result);
      message.success(
        `Active Directory synced: ${result.replicatedObjects} objects updated in ${result.latencyMs}ms.`,
      );
      loadData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to synchronize Active Directory.');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const records = await directoryService.exportEmployees();
      if (!records || records.length === 0) {
        message.warning('No employee records available to export.');
        return;
      }

      const headers = Object.keys(records[0]);
      const csvRows: string[] = [headers.join(',')];

      for (const row of records) {
        const values = headers.map((header) => {
          const val = row[header];
          if (val === null || val === undefined) return '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `directory_employees_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Directory records exported successfully.');
    } catch {
      message.error('Failed to export employee directory records.');
    }
  };

  const handleFilterByOU = (ouName: string) => {
    setOuFilter(ouName);
    setActiveTabKey('employees');
  };

  const totalEmployeesCount = stats?.totalEmployees ?? employees.length;
  const activeEmployeesCount =
    stats?.activeEmployees ?? employees.filter((e) => e.status === 'ACTIVE').length;
  const assignedWorkstationsCount =
    stats?.assignedWorkstations ?? employees.filter((e) => Boolean(e.computerName)).length;
  const totalGroupsCount = stats?.totalGroups ?? groups.length;
  const totalOUsCount = stats?.totalOUs ?? organizationalUnits.length;

  return (
    <PageContainer
      title="Directory"
      subtitle="Manage corporate employee records, Active Directory synchronization, security groups, and organizational units."
      breadcrumbs={[{ title: 'Directory' }]}
      stats={[
        {
          title: 'Total Employees',
          value: totalEmployeesCount,
          prefix: <TeamOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Records',
          value: activeEmployeesCount,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Assigned Workstations',
          value: assignedWorkstationsCount,
          prefix: <DesktopOutlined />,
          color: '#0ea5e9',
        },
        {
          title: 'Directory Groups',
          value: totalGroupsCount,
          prefix: <ShareAltOutlined />,
          color: '#8b5cf6',
        },
        {
          title: 'Organizational Units',
          value: totalOUsCount,
          prefix: <BranchesOutlined />,
          color: '#6366f1',
        },
      ]}
      extra={
        <>
          <Button
            icon={<SyncOutlined spin={syncing} />}
            onClick={handleSyncDomain}
            loading={syncing}
          >
            Sync Directory
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            Import CSV
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setCreateGroupModalOpen(true)}>
            Create Group
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setCreateEmployeeModalOpen(true)}
          >
            Add Employee
          </Button>
        </>
      }
    >
      {/* Active Directory Domain Federation Status Banner */}
      <Alert
        type="info"
        showIcon
        icon={<CloudSyncOutlined />}
        style={{ marginBottom: 16 }}
        message={
          <Flex justify="space-between" align="center" wrap gap={8}>
            <Text strong style={{ fontSize: 13 }}>
              Active Directory Domain Federation • Domain: <Text code>uims.internal</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Controller: <Text code>{syncResult?.controller || 'DC01-PRIMARY'}</Text> • Status:{' '}
              <Text strong style={{ color: '#10b981' }}>
                {syncResult?.status || 'HEALTHY'}
              </Text>{' '}
              • Latency: {syncResult?.latencyMs ? `${syncResult.latencyMs}ms` : '18ms'}
            </Text>
          </Flex>
        }
      />

      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        size="large"
        items={[
          {
            key: 'employees',
            label: (
              <span>
                <TeamOutlined style={{ marginRight: 6 }} />
                Employees ({employees.length})
              </span>
            ),
            children: (
              <EmployeesTab
                employees={employees}
                loading={loading}
                onRefresh={loadData}
                createModalOpen={createEmployeeModalOpen}
                setCreateModalOpen={setCreateEmployeeModalOpen}
                importModalOpen={importModalOpen}
                setImportModalOpen={setImportModalOpen}
                ouFilter={ouFilter}
                onClearOuFilter={() => setOuFilter('all')}
              />
            ),
          },
          {
            key: 'groups',
            label: (
              <span>
                <ShareAltOutlined style={{ marginRight: 6 }} />
                Groups ({groups.length})
              </span>
            ),
            children: (
              <DirectoryGroupsTab
                groups={groups}
                loading={loading}
                onRefresh={loadData}
                createModalOpen={createGroupModalOpen}
                setCreateModalOpen={setCreateGroupModalOpen}
              />
            ),
          },
          {
            key: 'ous',
            label: (
              <span>
                <BranchesOutlined style={{ marginRight: 6 }} />
                Organizational Units ({organizationalUnits.length})
              </span>
            ),
            children: (
              <OrganizationalUnitsTab
                units={organizationalUnits}
                totalUsers={totalEmployeesCount}
                onFilterByOU={handleFilterByOU}
              />
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
