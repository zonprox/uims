import { DownloadOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import type { DocumentScanDetailDto } from '@uims/shared-types';
import { App, Button, Descriptions, Empty, Modal, Space, Spin, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { PreviewModalState } from '../types/access-control.types';
import { downloadBlobFile, formatDateTime, formatFileSize } from '../utils/access-control.utils';

interface DocumentPreviewModalProps {
  state: PreviewModalState;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ state, onClose }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [detail, setDetail] = useState<DocumentScanDetailDto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    if (state.open && state.documentId) {
      setLoading(true);
      Promise.all([
        accessControlService.getDocumentById(state.documentId),
        accessControlService.downloadDocumentBlob(state.documentId),
      ])
        .then(([doc, { blob }]) => {
          if (!isMounted) return;
          setDetail(doc);
          const typedBlob =
            doc.mimeType && blob.type !== doc.mimeType
              ? new Blob([blob], { type: doc.mimeType })
              : blob;
          objectUrl = URL.createObjectURL(typedBlob);
          setPreviewUrl(objectUrl);
        })
        .catch((err: unknown) => {
          if (!isMounted) return;
          message.error(formatErrorMessage(err, 'load approval document scan'));
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    } else {
      setDetail(null);
      setPreviewUrl(null);
    }

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [state.open, state.documentId, message]);

  const handleDownload = async () => {
    if (!state.documentId) return;
    setDownloading(true);
    try {
      const { blob, filename } = await accessControlService.downloadDocumentBlob(state.documentId);
      downloadBlobFile(blob, detail?.originalName || filename);
      message.success('Document scan downloaded successfully.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'download document scan'));
    } finally {
      setDownloading(false);
    }
  };

  const isImage = detail?.mimeType?.startsWith('image/');
  const isPdf = detail?.mimeType === 'application/pdf';
  const fileUrl = previewUrl || undefined;

  return (
    <Modal
      open={state.open}
      onCancel={onClose}
      title={
        <Space>
          {isPdf ? <FilePdfOutlined style={{ color: '#ff4d4f' }} /> : <FileTextOutlined />}
          <span>Approval Document Scan Preview</span>
          {detail?.documentType && (
            <Tag color={detail.documentType === 'GRANT' ? 'green' : 'volcano'}>
              {detail.documentType}
            </Tag>
          )}
        </Space>
      }
      width={760}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          loading={downloading}
          onClick={handleDownload}
        >
          Download Scan
        </Button>,
      ]}
      styles={{
        body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 8 },
      }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin description="Loading document details..." />
        </div>
      ) : detail ? (
        <Space vertical size="middle" style={{ width: '100%' }}>
          <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Reference #">
              {detail.referenceNumber || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="File Name">{detail.originalName}</Descriptions.Item>
            <Descriptions.Item label="Approver">{detail.approverName}</Descriptions.Item>
            <Descriptions.Item label="Approver Title">
              {detail.approverTitle || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="File Size">
              {formatFileSize(detail.fileSize)}
            </Descriptions.Item>
            <Descriptions.Item label="Uploaded At">
              {formatDateTime(detail.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Reason" span={{ xs: 1, sm: 2 }}>
              {detail.reason}
            </Descriptions.Item>
            {detail.notes && (
              <Descriptions.Item label="Notes" span={{ xs: 1, sm: 2 }}>
                {detail.notes}
              </Descriptions.Item>
            )}
          </Descriptions>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            {isImage && fileUrl ? (
              <img
                src={fileUrl}
                alt="Document Scan"
                style={{
                  maxWidth: '100%',
                  maxHeight: 450,
                  objectFit: 'contain',
                  borderRadius: 4,
                }}
              />
            ) : isPdf && fileUrl ? (
              <iframe
                src={fileUrl}
                title="Document PDF Preview"
                style={{
                  width: '100%',
                  height: 450,
                  border: 'none',
                  borderRadius: 4,
                }}
              />
            ) : (
              <Empty
                description="In-browser preview is not available for this file type. Please click 'Download Scan' to inspect."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </Space>
      ) : (
        <Empty description="Document record not found" />
      )}
    </Modal>
  );
};
