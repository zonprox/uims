import { Empty, QRCode, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface PrintableAssetSheetProps {
  assets: Asset[];
  columns?: 3 | 4;
}

export const PrintableAssetSheet: React.FC<PrintableAssetSheetProps> = React.memo(
  ({ assets, columns = 3 }) => {
    if (!assets || assets.length === 0) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Empty description="No assets selected for printing." />
        </div>
      );
    }

    const is4Cols = columns === 4;
    const qrSize = is4Cols ? 68 : 88;

    return (
      <div
        className={`printable-asset-sheet ${is4Cols ? 'cols-4' : 'cols-3'}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: is4Cols ? '6px' : '8px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {assets.map((asset) => {
          const sapCode = asset.assetCode || asset.parent?.assetCode || '—';
          const subcode = asset.subcode || asset.tag || 'N/A';
          const modelInfo = [asset.manufacturer, asset.model].filter(Boolean).join(' ');
          const displayName =
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
              key={asset.id}
              className="printable-sheet-card"
              style={{
                border: '1.5px dashed #777777',
                borderRadius: '4px',
                padding: '8px 10px',
                background: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: is4Cols ? 8 : 12,
                textAlign: 'left',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
              }}
            >
              {/* Left Column: QR Code (No logo, clean high-contrast scan area) */}
              <div
                className="printable-sheet-qr"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  flexShrink: 0,
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                <QRCode
                  type="svg"
                  value={subcode}
                  size={qrSize}
                  bordered={false}
                  color="#000000"
                  bgColor="#ffffff"
                  style={{
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>

              {/* Right Column: IT ASSET TAGGING details */}
              <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                <div
                  style={{
                    fontSize: is4Cols ? 11.5 : 13,
                    letterSpacing: '0.6px',
                    color: '#000000',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    borderBottom: '1.5px solid #000000',
                    paddingBottom: is4Cols ? 2 : 3,
                    marginBottom: is4Cols ? 4 : 6,
                    lineHeight: 1.2,
                  }}
                >
                  IT ASSET TAGGING
                </div>

                <div
                  style={{
                    fontSize: is4Cols ? 10 : 11,
                    lineHeight: 1.35,
                    color: '#000000',
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
                        color: '#000000',
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
                    <Text
                      strong
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: is4Cols ? '11px' : '13px',
                        color: '#000000',
                        lineHeight: 1.2,
                      }}
                    >
                      {subcode}
                    </Text>
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
                    <span
                      style={{
                        color: '#000000',
                      }}
                    >
                      {displayName}
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
                    <span style={{ fontWeight: 700 }}>Date: </span>
                    <span
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        color: '#000000',
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
                    <span style={{ fontWeight: 600, color: '#000000' }}>{costCenterDisplay}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

PrintableAssetSheet.displayName = 'PrintableAssetSheet';
