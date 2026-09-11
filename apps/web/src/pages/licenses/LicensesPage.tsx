import {
  DollarOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Col, Flex, Form, Input, Row, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import PageContainer from '../../components/PageContainer';
import type { DirectoryUser } from '../../services/directory.service';
import { type License, type LicenseStats, licensesService } from '../../services/licenses.service';
import { LicenseAssignmentModal } from './components/LicenseAssignmentModal';
import { LicenseFormModal } from './components/LicenseFormModal';
import { LicenseSeatsDrawer } from './components/LicenseSeatsDrawer';
import { LicenseTable } from './components/LicenseTable';

const VENDOR_OPTIONS = [
  { label: 'All Vendors', value: 'all' },
  { label: 'Microsoft', value: 'Microsoft' },
  { label: 'Adobe', value: 'Adobe' },
  { label: 'JetBrains', value: 'JetBrains' },
  { label: 'Figma', value: 'Figma' },
  { label: 'Broadcom / VMware', value: 'Broadcom / VMware' },
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Subscription', value: 'Subscription' },
  { label: 'Perpetual', value: 'Perpetual' },
  { label: 'Volume', value: 'Volume' },
  { label: 'OEM', value: 'OEM' },
];

export default function LicensesPage() {
  const { message } = App.useApp();
  const [licenses, setLicenses] = useState<Array<License>>([]);
  const [stats, setStats] = useState<LicenseStats>({
    total: 0,
    annualSpend: 0,
    utilization: 0,
    expiringCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals & Drawers state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [seatsDrawerOpen, setSeatsDrawerOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningSeat, setAssigningSeat] = useState(false);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        licensesService.getLicenses({
          search: searchQuery || undefined,
          vendor: vendorFilter !== 'all' ? vendorFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        }),
        licensesService.getStats().catch((_error: unknown) => null),
      ]);
      setLicenses(list);
      if (statsData) {
        setStats(statsData);
      } else {
        const totalSpend = list.reduce((sum, l) => sum + l.usedSeats * l.costPerSeat, 0);
        const totalSeats = list.reduce((sum, l) => sum + l.totalSeats, 0);
        const usedSeats = list.reduce((sum, l) => sum + l.usedSeats, 0);
        const overallUtilization = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
        const expiringCount = list.filter((l) => l.status === 'Expiring').length;
        setStats({
          total: list.length,
          annualSpend: totalSpend,
          utilization: overallUtilization,
          expiringCount,
        });
      }
    } catch (_err: unknown) {
      message.error('Failed to load software licenses.');
    } finally {
      setLoading(false);
    }
  }, [message, searchQuery, typeFilter, vendorFilter]);

  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('id') || searchParams.get('key');

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (deepLinkId && licenses.length > 0) {
      const match = licenses.find(
        (l) => l.id === deepLinkId || l.name.toLowerCase().includes(deepLinkId.toLowerCase()),
      );
      if (match) {
        setSelectedLicense(match);
        setSeatsDrawerOpen(true);
      }
    }
  }, [deepLinkId, licenses]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingLicense(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'Subscription',
      totalSeats: 10,
      costPerSeat: 120,
      autoRenew: true,
      expiryDate: dayjs().add(1, 'year'),
    });
    setModalOpen(true);
  }, [form]);

  const handleOpenEditModal = useCallback(
    (license: License) => {
      setEditingLicense(license);
      form.setFieldsValue({
        ...license,
        expiryDate: license.expiryDate ? dayjs(license.expiryDate) : undefined,
      });
      setModalOpen(true);
    },
    [form],
  );

  const handleSaveLicense = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      const payload = {
        name: values.name,
        vendor: values.vendor,
        type: values.type,
        totalSeats: Number(values.totalSeats),
        costPerSeat: Number(values.costPerSeat || 0),
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
        licenseKey: values.licenseKey || 'N/A',
        status: values.status || 'Active',
        autoRenew: values.autoRenew ?? true,
        notes: values.notes,
      };

      if (editingLicense) {
        await licensesService.updateLicense(editingLicense.id, payload);
        message.success(`License "${payload.name}" updated successfully.`);
      } else {
        await licensesService.createLicense(payload);
        message.success(`License "${payload.name}" created successfully.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save license.');
    } finally {
      setModalSubmitting(false);
    }
  }, [editingLicense, form, loadData, message]);

  const handleDeleteLicense = useCallback(
    async (id: string) => {
      try {
        await licensesService.deleteLicense(id);
        message.success('License deleted successfully.');
        loadData();
      } catch (_err: unknown) {
        message.error('Failed to delete license.');
      }
    },
    [loadData, message],
  );

  const handleOpenSeatsDrawer = useCallback((license: License) => {
    setSelectedLicense(license);
    setSeatsDrawerOpen(true);
  }, []);

  const handleAssignUser = useCallback(
    async (user: DirectoryUser) => {
      if (!selectedLicense) return;

      const remainingSeats = Math.max(0, selectedLicense.totalSeats - selectedLicense.usedSeats);
      if (remainingSeats <= 0) {
        message.error(
          'All seats are currently allocated. Upgrade seat count to assign more users.',
        );
        return;
      }

      setAssigningSeat(true);
      try {
        await licensesService.assignUser(selectedLicense.id, {
          userId: user.id,
          name: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          department: user.department?.name || 'General',
        });
        message.success(`Seat assigned to ${user.fullName || user.email}.`);
        setAssignModalOpen(false);

        const freshLicense = await licensesService.getLicense(selectedLicense.id);
        setSelectedLicense(freshLicense);
        loadData();
      } catch (_err: unknown) {
        message.error('Failed to allocate seat.');
      } finally {
        setAssigningSeat(false);
      }
    },
    [loadData, message, selectedLicense],
  );

  const handleRevokeSeat = useCallback(
    async (assignmentId: string) => {
      if (!selectedLicense) return;
      try {
        await licensesService.revokeUser(selectedLicense.id, assignmentId);
        message.success('Seat revoked successfully.');

        const freshLicense = await licensesService.getLicense(selectedLicense.id);
        setSelectedLicense(freshLicense);
        loadData();
      } catch (_err: unknown) {
        message.error('Failed to revoke seat.');
      }
    },
    [loadData, message, selectedLicense],
  );

  const statsItems = useMemo(
    () => [
      {
        title: 'Total Licenses',
        value: stats.total,
        prefix: <SafetyCertificateOutlined />,
        color: '#1677ff',
      },
      {
        title: 'Annual Spend',
        value: `$${stats.annualSpend.toLocaleString()}`,
        prefix: <DollarOutlined />,
        color: '#10b981',
      },
      {
        title: 'Seat Utilization',
        value: `${stats.utilization}%`,
        prefix: <TeamOutlined />,
        color: '#6366f1',
      },
      {
        title: 'Expiring (<30 Days)',
        value: stats.expiringCount,
        prefix: <WarningOutlined />,
        color: stats.expiringCount > 0 ? '#ef4444' : '#94a3b8',
      },
    ],
    [stats],
  );

  return (
    <PageContainer
      title="Software Licenses"
      subtitle="Track software seat utilization, upcoming renewals, and compliance across all software licenses."
      breadcrumbs={[{ title: 'Licenses' }]}
      stats={statsItems}
      extra={
        <Flex gap={8}>
          <Tooltip title="Refresh licenses">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Create License
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search software by name, vendor, contract key..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={vendorFilter}
                onChange={setVendorFilter}
                style={{ width: 140 }}
                placeholder="Vendor"
                options={VENDOR_OPTIONS}
              />

              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 130 }}
                placeholder="Type"
                options={TYPE_OPTIONS}
              />

              {(searchQuery || vendorFilter !== 'all' || typeFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setVendorFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </Flex>
          </Col>
        </Row>

        <LicenseTable
          licenses={licenses}
          loading={loading}
          onOpenSeatsDrawer={handleOpenSeatsDrawer}
          onOpenEditModal={handleOpenEditModal}
          onDeleteLicense={handleDeleteLicense}
        />
      </Card>

      <LicenseFormModal
        open={modalOpen}
        editingLicense={editingLicense}
        form={form}
        submitting={modalSubmitting}
        onSave={handleSaveLicense}
        onCancel={() => setModalOpen(false)}
      />

      <LicenseSeatsDrawer
        open={seatsDrawerOpen}
        license={selectedLicense}
        onClose={() => setSeatsDrawerOpen(false)}
        onOpenAssignModal={() => setAssignModalOpen(true)}
        onRevokeSeat={handleRevokeSeat}
      />

      <LicenseAssignmentModal
        open={assignModalOpen}
        license={selectedLicense}
        submitting={assigningSeat}
        onAssign={handleAssignUser}
        onCancel={() => setAssignModalOpen(false)}
      />
    </PageContainer>
  );
}
