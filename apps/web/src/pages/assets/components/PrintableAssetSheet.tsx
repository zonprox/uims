import { Empty, QRCode, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface PrintableAssetSheetProps {
  assets: Asset[];
  columns?: number;
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

    const qrSize = columns === 3 ? 52 : 44;

    return (
      <div
        className={`printable-asset-sheet cols-${columns}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: columns === 3 ? '8px' : '6px',
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
                padding: columns === 3 ? '8px 10px' : '4px 6px',
                background: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                textAlign: 'left',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              {/* Left Column: QR Code (Sharp high-contrast scan area) */}
              <div
                className="printable-sheet-qr"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  flexShrink: 0,
                  padding: 1,
                  borderRadius: 3,
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
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div
                  className="printable-sheet-meta-title"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.4px',
                    color: '#000000',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    borderBottom: '1px solid #000000',
                    paddingBottom: 2,
                    marginBottom: 3,
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  IT ASSET TAGGING
                </div>

                <div
                  className="printable-sheet-meta-rows"
                  style={{
                    fontSize: 8.5,
                    lineHeight: 1.25,
                    color: '#000000',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    minWidth: 0,
                  }}
                >
                  <div
                    className="printable-sheet-meta-row"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 3,
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span
                      className="label-key"
                      style={{ fontWeight: 700, flexShrink: 0, fontSize: 8.5 }}
                    >
                      SAP:
                    </span>
                    <span
                      className="label-val"
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: 600,
                        color: '#000000',
                        fontSize: 8.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sapCode}
                    </span>
                  </div>

                  <div
                    className="printable-sheet-meta-row"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 3,
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span
                      className="label-key"
                      style={{ fontWeight: 700, flexShrink: 0, fontSize: 8.5 }}
                    >
                      SUB:
                    </span>
                    <Text
                      strong
                      className="label-val"
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: columns === 3 ? '13px' : '11px',
                        color: '#000000',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {subcode}
                    </Text>
                  </div>

                  <div
                    className="printable-sheet-meta-row"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 3,
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span
                      className="label-key"
                      style={{ fontWeight: 700, flexShrink: 0, fontSize: 8.5 }}
                    >
                      Model:
                    </span>
                    <span
                      className="label-val"
                      style={{
                        color: '#000000',
                        fontSize: 8.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={displayName}
                    >
                      {displayName}
                    </span>
                  </div>

                  <div
                    className="printable-sheet-meta-row"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 3,
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span
                      className="label-key"
                      style={{ fontWeight: 700, flexShrink: 0, fontSize: 8.5 }}
                    >
                      Date:
                    </span>
                    <span
                      className="label-val"
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        color: '#000000',
                        fontSize: 8.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formattedDate}
                    </span>
                  </div>

                  <div
                    className="printable-sheet-meta-row"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 3,
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span
                      className="label-key"
                      style={{ fontWeight: 700, flexShrink: 0, fontSize: 8.5 }}
                    >
                      CC:
                    </span>
                    <span
                      className="label-val"
                      style={{
                        fontWeight: 600,
                        color: '#000000',
                        fontSize: 8.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={costCenterDisplay}
                    >
                      {costCenterDisplay}
                    </span>
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
