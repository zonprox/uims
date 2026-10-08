import {
  CheckCircleOutlined,
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
} from '@uims/shared-types';
import { App, Button, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { directoryService } from '../../services/directory.service';
import { DirectoryGroupsTab } from './DirectoryGroupsTab';
import { EmployeesTab } from './EmployeesTab';
import { formatErrorMessage } from '../../utils/feedback';

export default function DirectoryPage() {
  const { message } = App.useApp();

  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [stats, setStats] = useState<DirectorySummaryStats | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('employees');

  // Modal triggers
  const [createEmployeeModalOpen, setCreateEmployeeModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, groupsRes, statsRes] = await Promise.all([
        directoryService.getEmployees({ limit: 100 }),
        directoryService.getGroups().catch((_error: unknown) => []),
        directoryService.getStats().catch((_error: unknown) => null),
      ]);

      const items = Array.isArray(empRes) ? empRes : empRes.items || [];
      setEmployees(items);
      setGroups(groupsRes || []);
      setStats(statsRes);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load corporate directory records'));
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
      message.success(
        `Active Directory synced: ${result.replicatedObjects} objects updated in ${result.latencyMs}ms.`,
      );
      loadData();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'synchronize Active Directory'));
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
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'export employee directory records'));
    }
  };

  const totalEmployeesCount = stats?.totalEmployees ?? employees.length;
  const activeEmployeesCount =
    stats?.activeEmployees ?? employees.filter((e) => e.status === 'ACTIVE').length;
  const assignedWorkstationsCount =
    stats?.assignedWorkstations ?? employees.filter((e) => (e.assignedAssetsCount ?? 0) > 0).length;
  const totalGroupsCount = stats?.totalGroups ?? groups.length;

  return (
    <PageContainer
      title="Employee Directory"
      subtitle="Manage corporate employee records, Active Directory synchronization, and security groups."
      breadcrumbs={[{ title: 'Employee Directory' }]}
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
      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        items={[
          {
            key: 'employees',
            icon: <TeamOutlined />,
            label: `Employees (${employees.length})`,
            children: (
              <EmployeesTab
                employees={employees}
                loading={loading}
                onRefresh={loadData}
                createModalOpen={createEmployeeModalOpen}
                setCreateModalOpen={setCreateEmployeeModalOpen}
                importModalOpen={importModalOpen}
                setImportModalOpen={setImportModalOpen}
              />
            ),
          },
          {
            key: 'groups',
            icon: <ShareAltOutlined />,
            label: `Groups (${groups.length})`,
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
        ]}
      />
    </PageContainer>
  );
}
