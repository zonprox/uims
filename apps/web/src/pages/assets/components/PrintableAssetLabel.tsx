import { Flex, QRCode, theme } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import type { Asset } from '../../../services/assets.service';

export interface PrintableAssetLabelProps {
  asset: Asset;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  maxWidth?: number;
}

export const PrintableAssetLabel: React.FC<PrintableAssetLabelProps> = React.memo(
  ({ asset, containerRef, maxWidth = 380 }) => {
    const { token } = theme.useToken();

    const sapCode = asset.assetCode || asset.parent?.assetCode || asset.tag || 'N/A';
    const subcode = asset.subcode || asset.tag || 'N/A';
    const modelInfo = [asset.manufacturer, asset.model].filter(Boolean).join(' ');
    const modelName =
      asset.name ||
      (asset.parent ? `${asset.parent.manufacturer} ${asset.parent.model}` : modelInfo) ||
      'Hardware Asset';
    const formattedDate = asset.purchaseDate
      ? dayjs(asset.purchaseDate).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD');
    const costCenterDisplay = asset.costCenter
      ? typeof asset.costCenter === 'object'
        ? `${asset.costCenter.code || ''} ${asset.costCenter.name ? `- ${asset.costCenter.name}` : ''}`.trim()
        : String(asset.costCenter)
      : 'IT-OPS';

    return (
      <div
        ref={containerRef}
        className="printable-asset-label"
        style={{
          padding: '12px 14px',
          backgroundColor: token.colorFillAlter,
          color: token.colorText,
          border: `1.5px dashed ${token.colorBorderSecondary || '#777777'}`,
          borderRadius: 4,
          width: '100%',
          maxWidth,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          textAlign: 'left',
        }}
      >
        {/* Left Column: Centered High-Contrast QR Code (No Logo) */}
        <Flex
          justify="center"
          align="center"
          style={{
            flexShrink: 0,
            background: '#ffffff',
            padding: 4,
            borderRadius: token.borderRadiusSM,
          }}
        >
          <QRCode
            type="svg"
            value={subcode}
            size={110}
            bordered={false}
            color="#000000"
            bgColor="#ffffff"
          />
        </Flex>

        {/* Right Column: IT ASSET TAGGING Metadata */}
        <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: token.colorText,
              borderBottom: `1.5px solid ${token.colorBorder || '#000000'}`,
              paddingBottom: 3,
              marginBottom: 6,
              lineHeight: 1.2,
            }}
          >
            IT ASSET TAGGING
          </div>
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.3,
              color: token.colorText,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div
              style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: 1.3,
              }}
            >
              <span style={{ fontWeight: 700 }}>SAP Code: </span>
              <span
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontWeight: 600,
                }}
              >
                {sapCode}
              </span>
            </div>
            <div
              style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: 1.3,
              }}
            >
              <span style={{ fontWeight: 700 }}>SUB Code: </span>
              <span
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontWeight: 700,
                }}
              >
                {subcode}
              </span>
            </div>
            <div
              style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: 1.3,
              }}
            >
              <span style={{ fontWeight: 700 }}>Model: </span>
              <span>{modelName}</span>
            </div>
            <div
              style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: 1.3,
              }}
            >
              <span style={{ fontWeight: 700 }}>Date: </span>
              <span
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {formattedDate}
              </span>
            </div>
            <div
              style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: 1.3,
              }}
            >
              <span style={{ fontWeight: 700 }}>Cost Center: </span>
              <span style={{ fontWeight: 600 }}>{costCenterDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

PrintableAssetLabel.displayName = 'PrintableAssetLabel';
