import { FileTextOutlined, FileWordOutlined, PrinterOutlined } from '@ant-design/icons';
import { App, Button, Flex, Modal, Typography, theme } from 'antd';
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
  downloadingDocx?: boolean;
}

export const HandoverDocumentModal: React.FC<HandoverDocumentModalProps> = React.memo(
  ({ open, title, html, onClose, onDownloadDocx, downloadingDocx = false }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();

    const handlePrint = () => {
      printDocumentHtml(html);
    };

    const handleDownload = async () => {
      if (!onDownloadDocx) return;
      try {
        await onDownloadDocx();
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to download Word document.');
      }
    };

    const srcDoc = useMemo(() => html, [html]);

    return (
      <Modal
        title={
          <Flex align="center" gap={8}>
            <FileTextOutlined style={{ color: token.colorPrimary }} />
            <span>{title}</span>
          </Flex>
        }
        open={open}
        onCancel={onClose}
        width={900}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          onDownloadDocx && (
            <Button
              key="download-docx"
              type="primary"
              icon={<FileWordOutlined />}
              loading={downloadingDocx}
              onClick={handleDownload}
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
              backgroundColor: token.colorWhite,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              overflow: 'hidden',
              boxShadow: token.boxShadowSecondary,
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
