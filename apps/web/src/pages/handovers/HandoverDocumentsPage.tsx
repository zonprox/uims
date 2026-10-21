import {
  AppstoreOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  BarsOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FileWordOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  type TableProps,
  Tag,
  Tooltip,
  Typography,
  Upload,
  theme,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import PageContainer, { type PageStatItem } from '../../components/PageContainer';
import { HandoverDocumentModal } from '../assets/components/HandoverDocumentModal';
import { downloadBlobFile } from '../assets/utils/printDocument';
import { assetsService } from '../../services/assets.service';
import {
  dashboardService,
  type PendingHandoverRecordItem,
  type PendingHandoverSummaryResponse,
} from '../../services/dashboard.service';

const { Text } = Typography;

export interface HandoverTableRow extends PendingHandoverRecordItem {
  comboItems?: PendingHandoverRecordItem[];
  comboAssetIds?: string[];
  isCombo?: boolean;
}

export function HandoverDocumentsPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PendingHandoverSummaryResponse | null>(null);

  // Filters, search & view mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'COMBO' | 'SINGLE'>('COMBO');

  // Preview & operation states
  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState<HandoverTableRow | null>(
    null,
  );
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [downloadingDocxId, setDownloadingDocxId] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const loadData = useCallback(
    async (isManual = false) => {
      try {
        setLoading(true);
        const res = await dashboardService.getPendingHandovers();
        setSummary(res);
        if (isManual) {
          message.success('Handover compliance records refreshed');
        }
      } catch (error: unknown) {
        message.warning(
          error instanceof Error ? error.message : 'Failed to load pending handover documents',
        );
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time window event invalidation
  useEffect(() => {
    const handleCustodyEvent = () => {
      loadData(false);
    };
    window.addEventListener('uims:handover-update', handleCustodyEvent);
    window.addEventListener('uims:notification', handleCustodyEvent);
    return () => {
      window.removeEventListener('uims:handover-update', handleCustodyEvent);
      window.removeEventListener('uims:notification', handleCustodyEvent);
    };
  }, [loadData]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
  };

  const isFiltered = Boolean(searchQuery.trim() || typeFilter !== 'ALL' || statusFilter !== 'ALL');

  const filteredRecords = useMemo(() => {
    if (!summary?.records) return [];

    return summary.records.filter((record) => {
      // 1. Handover Type Filter
      if (typeFilter !== 'ALL') {
        const recType = (record.type || record.handoverType || '').toUpperCase();
        if (recType !== typeFilter) return false;
      }

      // 2. SLA Status Filter
      if (statusFilter === 'OVERDUE' && !record.isOverdue) return false;
      if (statusFilter === 'PENDING' && record.isOverdue) return false;

      // 3. Search Query Filter across all entity attributes
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTag = record.assetTag?.toLowerCase().includes(q);
        const matchSubcode = record.subcode?.toLowerCase().includes(q);
        const matchModel = record.modelName?.toLowerCase().includes(q);
        const matchSerial = record.serialNumber?.toLowerCase().includes(q);
        const matchCustodian = record.recipientName?.toLowerCase().includes(q);
        const matchEmail = record.recipientEmail?.toLowerCase().includes(q);
        const matchDept = (record.department || record.departmentName)?.toLowerCase().includes(q);

        if (
          !matchTag &&
          !matchSubcode &&
          !matchModel &&
          !matchSerial &&
          !matchCustodian &&
          !matchEmail &&
          !matchDept
        ) {
          return false;
        }
      }

      return true;
    });
  }, [summary?.records, typeFilter, statusFilter, searchQuery]);

  const displayedRecords: HandoverTableRow[] = useMemo(() => {
    if (viewMode === 'SINGLE') {
      return filteredRecords.map((rec) => ({
        ...rec,
        isCombo: false,
        comboItems: [rec],
        comboAssetIds: rec.assetId ? [rec.assetId] : [],
      }));
    }

    const groups = new Map<string, PendingHandoverRecordItem[]>();
    filteredRecords.forEach((rec, index) => {
      const rawCustodian =
        rec.recipientId ||
        rec.recipientEmail ||
        (rec.recipientName &&
        rec.recipientName !== 'Unassigned' &&
        rec.recipientName !== 'Unknown Custodian'
          ? rec.recipientName
          : '');
      const recType = (rec.type || rec.handoverType || 'ASSIGNMENT').toUpperCase();
      const datePart = rec.createdAt ? rec.createdAt.split('T')[0] : 'no-date';

      const groupKey = rawCustodian
        ? `combo::${recType}::${rawCustodian.toLowerCase()}::${datePart}`
        : `single::${rec.id || rec.recordId || rec.assetId || index}`;

      const existing = groups.get(groupKey);
      if (existing) {
        existing.push(rec);
      } else {
        groups.set(groupKey, [rec]);
      }
    });

    const rows: HandoverTableRow[] = [];
    groups.forEach((items) => {
      const primary = items[0];
      if (!primary) return;

      const comboAssetIds = Array.from(
        new Set(items.map((item) => item.assetId).filter((id): id is string => Boolean(id))),
      );

      if (items.length === 1) {
        rows.push({
          ...primary,
          isCombo: false,
          comboItems: items,
          comboAssetIds,
        });
      } else {
        const isOverdue = items.some((item) => Boolean(item.isOverdue));
        const maxDaysPending = Math.max(...items.map((item) => item.daysPending ?? 0));
        rows.push({
          ...primary,
          isCombo: true,
          comboItems: items,
          comboAssetIds,
          isOverdue,
          daysPending: maxDaysPending,
        });
      }
    });

    return rows;
  }, [filteredRecords, viewMode]);

  const handleDownloadDocx = async (record: HandoverTableRow) => {
    try {
      setDownloadingDocxId(record.id);
      const targetAssetIds =
        record.comboAssetIds && record.comboAssetIds.length > 0
          ? record.comboAssetIds
          : [record.assetId];
      const { blob, filename } = await assetsService.downloadHandoverDocx({
        assetIds: targetAssetIds,
        type: ((record.type || record.handoverType || 'ASSIGNMENT') as string).toLowerCase() as
          | 'assignment'
          | 'return'
          | 'transfer',
        recipientId: record.recipientId,
      });
      const targetFilename =
        filename ||
        `Handover_${record.subcode || record.assetTag}_${new Date().toISOString().split('T')[0]}.docx`;
      downloadBlobFile(blob, targetFilename);
      message.success('Handover document (.docx) downloaded successfully.');
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : 'Failed to download Word document. Please try again.',
      );
    } finally {
      setDownloadingDocxId(null);
    }
  };

  const handlePreviewForm = async (record: HandoverTableRow) => {
    try {
      const targetAssetIds =
        record.comboAssetIds && record.comboAssetIds.length > 0
          ? record.comboAssetIds
          : [record.assetId];
      const res = await assetsService.generateHandoverDocument({
        assetIds: targetAssetIds,
        type: ((record.type || record.handoverType || 'ASSIGNMENT') as string).toLowerCase() as
          | 'assignment'
          | 'return'
          | 'transfer',
        recipientId: record.recipientId,
      });
      setSelectedRecordForPreview(record);
      setPreviewHtml(res.html);
      setPreviewModalOpen(true);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Failed to generate document preview.');
    }
  };

  const handleUploadSignedCopy = async (file: File, record: HandoverTableRow) => {
    try {
      setUploadingDocId(record.id);
      const targetAssetIds =
        record.comboAssetIds && record.comboAssetIds.length > 0
          ? record.comboAssetIds
          : record.assetId
            ? [record.assetId]
            : [];
      const uploadRes = await assetsService.uploadHandoverDocument(file, record.assetId);
      const signedUrl = uploadRes.fileUrl;
      if (signedUrl && targetAssetIds.length > 0) {
        await Promise.all(
          targetAssetIds.map((assetId) =>
            assetsService.attachHandoverDocument(assetId, { fileUrl: signedUrl }),
          ),
        );
      }
      if (targetAssetIds.length > 1) {
        message.success(
          `Signed handover document uploaded for combo (${targetAssetIds.length} devices).`,
        );
      } else {
        message.success(
          `Signed handover document uploaded for ${record.subcode || record.assetTag}.`,
        );
      }
      loadData(false);
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : 'Failed to upload signed handover document.',
      );
    } finally {
      setUploadingDocId(null);
    }
    return false;
  };

  // 4 KPI Statistics Cards
  const statsItems: PageStatItem[] = useMemo(
    () => [
      {
        title: 'Total Pending',
        value: summary?.totalPending ?? 0,
        prefix: <SafetyCertificateOutlined />,
        color: token.colorWarning,
      },
      {
        title: 'Pending Assignments',
        value: summary?.pendingAssignments ?? summary?.breakdownByType?.assignment ?? 0,
        prefix: <ArrowUpOutlined />,
        color: token.colorPrimary,
      },
      {
        title: 'Pending Returns',
        value: summary?.pendingReturns ?? summary?.breakdownByType?.return ?? 0,
        prefix: <RollbackOutlined />,
        color: token.colorWarning,
      },
      {
        title: 'Pending Transfers',
        value: summary?.pendingTransfers ?? summary?.breakdownByType?.transfer ?? 0,
        prefix: <SwapOutlined />,
        color: '#722ed1',
      },
    ],
    [summary, token],
  );

  const columns: TableProps<HandoverTableRow>['columns'] = [
    {
      title: 'Asset & Hardware Model',
      key: 'assetTag',
      sorter: (a, b) =>
        (a.subcode || a.assetTag || a.modelName || '').localeCompare(
          b.subcode || b.assetTag || b.modelName || '',
        ),
      render: (_: unknown, record: HandoverTableRow) => {
        if (record.isCombo && record.comboItems && record.comboItems.length > 1) {
          const visibleItems = record.comboItems.slice(0, 2);
          const remainingCount = record.comboItems.length - visibleItems.length;
          const allModels = record.comboItems.map((i) => i.modelName).filter(Boolean);
          const uniqueModels = Array.from(new Set(allModels));
          const summaryText =
            uniqueModels.length > 0 ? uniqueModels.join(', ') : `${record.comboItems.length} units`;

          return (
            <Flex vertical gap={4} align="flex-start">
              <Flex align="center" gap={8} wrap>
                <Tag
                  color="geekblue"
                  icon={<AppstoreOutlined />}
                  style={{ margin: 0, fontSize: 11 }}
                >
                  Combo ({record.comboItems.length} devices)
                </Tag>
                <Tooltip title={allModels.join(' • ')}>
                  <Text strong style={{ fontSize: 13 }}>
                    {summaryText}
                  </Text>
                </Tooltip>
              </Flex>
              <Flex gap={4} wrap align="center">
                {visibleItems.map((item) => {
                  const itemLabel = item.subcode || item.assetTag || item.assetId;
                  return (
                    <Text
                      key={item.id || item.assetId}
                      strong
                      code
                      style={{
                        cursor: 'pointer',
                        color: token.colorPrimary,
                        margin: 0,
                        fontSize: 11.5,
                      }}
                      onClick={() => navigate(`/assets?drawer=${item.assetId}`)}
                    >
                      {itemLabel}
                    </Text>
                  );
                })}
                {remainingCount > 0 && (
                  <Tooltip
                    title={record.comboItems
                      .slice(2)
                      .map((item) => item.subcode || item.assetTag)
                      .join(', ')}
                  >
                    <Tag style={{ margin: 0, fontSize: 10.5 }}>+{remainingCount} more</Tag>
                  </Tooltip>
                )}
              </Flex>
            </Flex>
          );
        }

        const label = record.subcode || record.assetTag;
        return (
          <Flex align="center" gap={8} wrap>
            {label ? (
              <Text
                strong
                code
                style={{ cursor: 'pointer', color: token.colorPrimary, margin: 0 }}
                onClick={() => navigate(`/assets?drawer=${record.assetId}`)}
              >
                {label}
              </Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
            {record.modelName && (
              <Text strong style={{ fontSize: 13 }}>
                {record.modelName}
              </Text>
            )}
          </Flex>
        );
      },
    },
    {
      title: 'Handover Type',
      key: 'type',
      sorter: (a, b) =>
        (a.type || a.handoverType || '').localeCompare(b.type || b.handoverType || ''),
      render: (_: unknown, record: HandoverTableRow) => {
        const t = (record.type || record.handoverType || 'ASSIGNMENT').toUpperCase();
        const typeColor = t === 'ASSIGNMENT' ? 'blue' : t === 'RETURN' ? 'orange' : 'purple';
        return (
          <Tag color={typeColor} style={{ margin: 0, fontSize: 11 }}>
            {t}
          </Tag>
        );
      },
    },
    {
      title: 'Custodian',
      key: 'custodian',
      sorter: (a, b) => (a.recipientName || '').localeCompare(b.recipientName || ''),
      render: (_: unknown, record: HandoverTableRow) => (
        <Flex vertical gap={1} align="flex-start">
          <Text strong style={{ fontSize: 13 }}>
            {record.recipientName || 'Unassigned'}
          </Text>
          {record.recipientEmail && (
            <Text type="secondary" style={{ fontSize: 11.5 }}>
              {record.recipientEmail}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      sorter: (a, b) =>
        (a.department || a.departmentName || '').localeCompare(
          b.department || b.departmentName || '',
        ),
      render: (_: unknown, record: HandoverTableRow) => {
        const dept = record.department || record.departmentName;
        return dept ? (
          <Tag color="cyan" style={{ fontSize: 11.5, margin: 0 }}>
            {dept}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: 'SLA Status',
      key: 'status',
      sorter: (a, b) => Number(b.isOverdue ?? false) - Number(a.isOverdue ?? false),
      render: (_: unknown, record: HandoverTableRow) => (
        <Tag
          color={record.isOverdue ? 'volcano' : 'gold'}
          icon={record.isOverdue ? <WarningOutlined /> : <ClockCircleOutlined />}
          style={{ margin: 0 }}
        >
          {record.isOverdue ? 'Overdue (>3d)' : 'Pending Scanned Copy'}
        </Tag>
      ),
    },
    {
      title: 'Issued Date',
      key: 'createdAt',
      sorter: (a, b) => (a.daysPending ?? 0) - (b.daysPending ?? 0),
      render: (_: unknown, record: HandoverTableRow) => (
        <Space size={6} wrap={false}>
          <Text style={{ fontSize: 12.5 }}>
            {record.createdAt ? record.createdAt.split('T')[0] : '—'}
          </Text>
          <Text type={record.isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
            ({record.timeAgo || `${record.daysPending || 0}d ago`})
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: unknown, record: HandoverTableRow) => (
        <Space size="small">
          <Tooltip
            title={
              record.isCombo
                ? `Preview & Print Combo Form (${record.comboItems?.length ?? 0} devices)`
                : 'Preview & Print Form'
            }
          >
            <Button
              size="small"
              icon={<FileTextOutlined />}
              data-testid={`preview-handover-${record.id}`}
              onClick={() => handlePreviewForm(record)}
            />
          </Tooltip>

          <Tooltip
            title={
              record.isCombo
                ? `Download Combo Word (.docx) (${record.comboItems?.length ?? 0} devices)`
                : 'Download Word (.docx) Form'
            }
          >
            <Button
              size="small"
              icon={<FileWordOutlined />}
              loading={downloadingDocxId === record.id}
              data-testid={`download-docx-${record.id}`}
              onClick={() => handleDownloadDocx(record)}
            />
          </Tooltip>

          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              handleUploadSignedCopy(file, record);
              return false;
            }}
            accept=".pdf,.png,.jpg,.jpeg"
          >
            <Tooltip
              title={
                record.isCombo
                  ? `Upload Signed Copy for All ${record.comboItems?.length ?? 0} Combo Devices`
                  : 'Upload Signed Physical Copy'
              }
            >
              <Button
                size="small"
                type="primary"
                icon={<UploadOutlined />}
                loading={uploadingDocId === record.id}
                data-testid={`upload-signed-${record.id}`}
              >
                Upload
              </Button>
            </Tooltip>
          </Upload>

          <Tooltip title="View Asset Details">
            <Button
              size="small"
              type="text"
              shape="circle"
              icon={<ArrowRightOutlined />}
              data-testid={`view-asset-${record.id}`}
              onClick={() => navigate(`/assets?drawer=${record.assetId}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Handover Documents"
      subtitle="Track pending physical custody records, download generated forms, and upload signed compliance receipts."
      breadcrumbs={[{ title: 'Handover Documents' }]}
      tag={
        summary && summary.totalPending > 0 ? (
          <Tag color="warning" icon={<WarningOutlined />}>
            {summary.totalPending} Pending Action
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            100% Compliant
          </Tag>
        )
      }
      extra={
        <Flex gap={8} align="center">
          <Tooltip title="Refresh compliance records">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              disabled={loading}
              onClick={() => loadData(true)}
            >
              Refresh
            </Button>
          </Tooltip>
        </Flex>
      }
      stats={statsItems}
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={8} lg={7}>
            <Input.Search
              placeholder="Search tag, subcode, model, custodian, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={(val) => setSearchQuery(val)}
              allowClear
              data-testid="handover-search-input"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={16} lg={17}>
            <Flex gap={10} justify="flex-end" wrap align="center">
              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'COMBO' | 'SINGLE')}
                data-testid="handover-view-mode"
                options={[
                  {
                    label: 'Combo Batches',
                    value: 'COMBO',
                    icon: <AppstoreOutlined />,
                  },
                  {
                    label: 'Individual Units',
                    value: 'SINGLE',
                    icon: <BarsOutlined />,
                  },
                ]}
              />

              <div data-testid="handover-type-filter">
                <Select
                  value={typeFilter}
                  onChange={setTypeFilter}
                  style={{ width: 150 }}
                  options={[
                    { label: 'All Types', value: 'ALL' },
                    { label: 'Assignments', value: 'ASSIGNMENT' },
                    { label: 'Returns', value: 'RETURN' },
                    { label: 'Transfers', value: 'TRANSFER' },
                  ]}
                />
              </div>

              <div data-testid="handover-status-filter">
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 160 }}
                  options={[
                    { label: 'All Statuses', value: 'ALL' },
                    { label: 'Overdue (>3d)', value: 'OVERDUE' },
                    { label: 'Pending (<3d)', value: 'PENDING' },
                  ]}
                />
              </div>

              <Button
                icon={<ClearOutlined />}
                onClick={handleResetFilters}
                data-testid="handover-reset-filters"
              >
                Reset
              </Button>
            </Flex>
          </Col>
        </Row>

        <Table<HandoverTableRow>
          rowKey={(record) => record.id || record.recordId || record.assetId}
          columns={columns}
          dataSource={displayedRecords}
          loading={loading}
          size="small"
          tableLayout="auto"
          scroll={{ x: 'max-content' }}
          expandable={{
            rowExpandable: (record) =>
              Boolean(record.isCombo && (record.comboItems?.length ?? 0) > 1),
            expandedRowRender: (record) => (
              <Flex
                vertical
                gap={8}
                style={{
                  padding: '8px 12px',
                  background: token.colorFillAlter,
                  borderRadius: token.borderRadiusSM,
                }}
              >
                <Text strong style={{ fontSize: 12, color: token.colorTextSecondary }}>
                  Combo Breakdown — {record.comboItems?.length ?? 0} Devices Included in Single
                  Handover Document:
                </Text>
                <Flex vertical gap={6}>
                  {(record.comboItems ?? []).map((item, idx) => (
                    <Flex
                      key={item.id || item.assetId || idx}
                      align="center"
                      justify="space-between"
                      wrap
                      gap={12}
                      style={{
                        padding: '6px 10px',
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusSM,
                        border: `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      <Space size={10} wrap>
                        <Tag style={{ margin: 0, fontSize: 10.5 }}>#{idx + 1}</Tag>
                        <Text
                          strong
                          code
                          style={{ cursor: 'pointer', color: token.colorPrimary, margin: 0 }}
                          onClick={() => navigate(`/assets?drawer=${item.assetId}`)}
                        >
                          {item.subcode || item.assetTag || item.assetId}
                        </Text>
                        <Text strong style={{ fontSize: 12 }}>
                          {item.modelName || 'Hardware Unit'}
                        </Text>
                      </Space>
                      <Button
                        size="small"
                        type="link"
                        icon={<ArrowRightOutlined />}
                        data-testid={`inspect-combo-item-${item.id}`}
                        onClick={() => navigate(`/assets?drawer=${item.assetId}`)}
                      >
                        Inspect Asset
                      </Button>
                    </Flex>
                  ))}
                </Flex>
              </Flex>
            ),
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `${total} pending records`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  isFiltered
                    ? 'No matching handover records found'
                    : 'No pending handover documents'
                }
              />
            ),
          }}
        />
      </Card>

      {previewModalOpen && selectedRecordForPreview && (
        <HandoverDocumentModal
          open={previewModalOpen}
          title={
            selectedRecordForPreview.isCombo &&
            (selectedRecordForPreview.comboItems?.length ?? 0) > 1
              ? `Handover Record Preview — Combo (${selectedRecordForPreview.comboItems?.length} Devices)`
              : `Handover Record Preview — ${selectedRecordForPreview.subcode || selectedRecordForPreview.assetTag}`
          }
          html={previewHtml}
          filename={`Handover_${selectedRecordForPreview.subcode || selectedRecordForPreview.assetTag}`}
          onClose={() => setPreviewModalOpen(false)}
          onDownloadDocx={() => handleDownloadDocx(selectedRecordForPreview)}
          downloadingDocx={downloadingDocxId === selectedRecordForPreview.id}
        />
      )}
    </PageContainer>
  );
}

export default HandoverDocumentsPage;
