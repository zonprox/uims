import { ConfigProvider, Empty, QRCode, theme, Typography } from 'antd';
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
    const qrSize = is4Cols ? 76 : 90;

    return (
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
        <div
          className={`printable-asset-sheet ${is4Cols ? 'cols-4' : 'cols-3'}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: is4Cols ? '6px' : '8px',
            width: '100%',
            boxSizing: 'border-box',
            background: '#ffffff',
            padding: 8,
            borderRadius: 4,
          }}
        >
          {assets.map((asset) => {
            const modelInfo = [asset.manufacturer, asset.model].filter(Boolean).join(' ');
            const displayName = asset.name || modelInfo || 'Hardware Asset';

            return (
              <div
                key={asset.id}
                className="printable-sheet-card"
                style={{
                  border: '1.5px dashed #777777',
                  borderRadius: 4,
                  padding: '8px 10px',
                  background: '#ffffff',
                  color: '#000000',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.5px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    marginBottom: 2,
                    display: 'block',
                  }}
                >
                  UIMS ASSET
                </Text>

                <div
                  className="printable-sheet-qr"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 2,
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <QRCode
                    type="svg"
                    value={asset.tag}
                    size={qrSize}
                    bordered={false}
                    color="#000000"
                    bgColor="#ffffff"
                    style={{
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>

              <Text
                strong
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: is4Cols ? 11 : 13,
                  color: '#000000',
                  display: 'block',
                  marginTop: 4,
                  lineHeight: 1.2,
                }}
              >
                {asset.tag}
              </Text>

              <Text
                ellipsis={{ tooltip: displayName }}
                style={{
                  fontSize: is4Cols ? 9.5 : 11,
                  color: '#334155',
                  maxWidth: '100%',
                  display: 'block',
                  marginTop: 2,
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </Text>

              {asset.serialNumber ? (
                <Text
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: is4Cols ? 8.5 : 10,
                    color: '#64748b',
                    display: 'block',
                    marginTop: 2,
                    lineHeight: 1.2,
                  }}
                >
                  S/N: {asset.serialNumber}
                </Text>
              ) : null}
            </div>
          );
        })}
        </div>
      </ConfigProvider>
    );
  },
);

PrintableAssetSheet.displayName = 'PrintableAssetSheet';
