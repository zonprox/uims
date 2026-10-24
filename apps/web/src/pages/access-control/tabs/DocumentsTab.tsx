import {
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { DoorDocumentType, type DoorAccessDocumentScanDto } from '@uims/shared-types';
import { App, Button, Card, Col, Flex, Input, Row, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useState } from 'react';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { DocumentFilterState } from '../types/access-control.types';
import { downloadBlobFile, formatDateTime, formatFileSize } from '../utils/access-control.utils';

interface DocumentsTabProps {
  onPreview: (documentId: string) => void;
  refreshTrigger: number;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ onPreview, refreshTrigger }) => {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DoorAccessDocumentScanDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState<DocumentFilterState>({
    search: '',
    documentType: 'ALL',
  });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accessControlService.getDocuments({
        page,
        pageSize,
        search: filters.search.trim() || undefined,
        documentType: filters.documentType !== 'ALL' ? filters.documentType : undefined,
      });
      setDocuments(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load approval documents history'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, message]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments, refreshTrigger]);

  const handleDownload = async (doc: DoorAccessDocumentScanDto) => {
    try {
      setDownloadingId(doc.id);
      const { blob, filename } = await accessControlService.downloadDocumentBlob(doc.id);
      downloadBlobFile(blob, doc.originalName || filename);
      message.success('Approval document scan downloaded successfully.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'download approval scan document'));
    } finally {
      setDownloadingId(null);
    }
  };

  const columns: ColumnsType<DoorAccessDocumentScanDto> = [
    {
      title: 'Reference #',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 150,
      render: (ref: string, record) => (
        <span
          style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7', cursor: 'pointer' }}
          onClick={() => onPreview(record.id)}
        >
          {ref || '—'}
        </span>
      ),
    },
    {
      title: 'Action Type',
      dataIndex: 'documentType',
      key: 'documentType',
      width: 130,
      render: (type: DoorDocumentType) => (
        <Tag color={type === DoorDocumentType.GRANT ? 'green' : 'volcano'}>{type}</Tag>
      ),
    },
    {
      title: 'Scanned Document',
      key: 'file',
      render: (_, record) => {
        const isPdf = record.mimeType === 'application/pdf';
        return (
          <Space align="center" size={8}>
            {isPdf ? (
              <FilePdfOutlined style={{ color: '#ef4444', fontSize: 16 }} />
            ) : (
              <FileTextOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
            )}
            <Space vertical size={1}>
              <a style={{ fontWeight: 500, color: '#0f172a' }} onClick={() => onPreview(record.id)}>
                {record.originalName}
              </a>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {formatFileSize(record.fileSize)} • {record.mimeType}
              </span>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Approver',
      key: 'approver',
      render: (_, record) => (
        <Space vertical size={1} style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 600 }}>{record.approverName}</span>
          <span style={{ color: '#64748b' }}>{record.approverTitle || 'Authorized Official'}</span>
        </Space>
      ),
    },
    {
      title: 'Business Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string) => <Tooltip title={reason}>{reason}</Tooltip>,
    },
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Preview scan document">
            <Button size="small" icon={<EyeOutlined />} onClick={() => onPreview(record.id)} />
          </Tooltip>
          <Tooltip title="Download scan file">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadingId === record.id}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card styles={{ body: { padding: 16 } }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} md={10}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search reference #, reason, approver, file name..."
            allowClear
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
          />
        </Col>

        <Col xs={12} sm={6} md={6}>
          <Select
            style={{ width: '100%' }}
            value={filters.documentType}
            onChange={(val) => {
              setFilters((prev) => ({ ...prev, documentType: val }));
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Document Types' },
              { value: DoorDocumentType.GRANT, label: 'Access Grants' },
              { value: DoorDocumentType.REVOCATION, label: 'Access Revocations' },
            ]}
          />
        </Col>

        <Col xs={12} sm={18} md={8}>
          <Flex justify="flex-end">
            <Button icon={<ReloadOutlined />} onClick={loadDocuments}>
              Refresh
            </Button>
          </Flex>
        </Col>
      </Row>

      <Table
        dataSource={documents}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50'],
          showTotal: (totalCount) => `Total ${totalCount} approval documents`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </Card>
  );
};
