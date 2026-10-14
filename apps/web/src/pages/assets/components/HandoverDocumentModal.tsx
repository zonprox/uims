import {
  FileExcelOutlined,
  FileTextOutlined,
  FileWordOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { Button, Flex, Modal, Typography, theme } from 'antd';
import React, { useMemo } from 'react';
import { printDocumentHtml } from '../utils/printDocument';

const { Text } = Typography;

export interface HandoverDocumentModalProps {
  open: boolean;
  title: string;
  html: string;
  filename: string;
  onClose: () => void;
  onDownloadDocx?: () => Promise<void> | void;
  onDownloadXlsx?: () => Promise<void> | void;
  downloadingDocx?: boolean;
  downloadingXlsx?: boolean;
}

export const HandoverDocumentModal: React.FC<HandoverDocumentModalProps> = React.memo(
  ({
    open,
    title,
    html,
    onClose,
    onDownloadDocx,
    onDownloadXlsx,
    downloadingDocx = false,
    downloadingXlsx = false,
  }) => {
    const { token } = theme.useToken();

    const handlePrint = () => {
      printDocumentHtml(html);
    };

    const srcDoc = useMemo(() => html, [html]);

    return (
      <Modal
        title={
          <Flex align="center" justify="space-between" style={{ paddingRight: 32 }}>
            <Flex align="center" gap={8}>
              <FileTextOutlined style={{ color: token.colorPrimary }} />
              <span>{title}</span>
            </Flex>
            <Flex align="center" gap={8}>
              <Button size="small" icon={<PrinterOutlined />} onClick={handlePrint}>
                Print Record
              </Button>
              {onDownloadXlsx && (
                <Button
                  size="small"
                  icon={<FileExcelOutlined style={{ color: '#10b981' }} />}
                  loading={downloadingXlsx}
                  onClick={onDownloadXlsx}
                >
                  Download Excel
                </Button>
              )}
              {onDownloadDocx && (
                <Button
                  size="small"
                  type="primary"
                  icon={<FileWordOutlined />}
                  loading={downloadingDocx}
                  onClick={onDownloadDocx}
                >
                  Download Word (.docx)
                </Button>
              )}
            </Flex>
          </Flex>
        }
        open={open}
        onCancel={onClose}
        width={900}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          onDownloadXlsx && (
            <Button
              key="download-xlsx"
              icon={<FileExcelOutlined style={{ color: '#10b981' }} />}
              loading={downloadingXlsx}
              onClick={onDownloadXlsx}
            >
              Download Excel (.xlsx)
            </Button>
          ),
          onDownloadDocx && (
            <Button
              key="download-docx"
              type="primary"
              icon={<FileWordOutlined />}
              loading={downloadingDocx}
              onClick={onDownloadDocx}
            >
              Download Word (.docx)
            </Button>
          ),
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Record (A4)
          </Button>,
        ].filter(Boolean)}
        destroyOnHidden
        styles={{
          body: {
            padding: '12px 16px',
            backgroundColor: token.colorFillAlter,
          },
        }}
      >
        <Flex vertical gap={8}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Print-ready enterprise document preview. Formatted for standard A4 paper with metadata,
            equipment details, and signature sections.
          </Text>
          <div
            style={{
              width: '100%',
              height: 560,
              backgroundColor: '#fff',
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <iframe
              title="Handover Document Preview"
              srcDoc={srcDoc}
              style={{
                width: '100%',
                height: 100,
                minHeight: '100%',
                border: 'none',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </Flex>
      </Modal>
    );
  },
);

HandoverDocumentModal.displayName = 'HandoverDocumentModal';
