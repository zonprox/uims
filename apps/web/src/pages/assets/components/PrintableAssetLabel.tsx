import { Flex, QRCode, Typography, theme } from 'antd';
import React from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface PrintableAssetLabelProps {
  asset: Asset;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  maxWidth?: number;
}

export const PrintableAssetLabel: React.FC<PrintableAssetLabelProps> = React.memo(
  ({ asset, containerRef, maxWidth = 280 }) => {
    const { token } = theme.useToken();

    return (
      <div
        ref={containerRef}
        className="printable-asset-label"
        style={{
          padding: token.paddingLG,
          backgroundColor: token.colorFillAlter,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          textAlign: 'center',
          width: '100%',
          maxWidth,
          boxSizing: 'border-box',
        }}
      >
        <Flex justify="center" align="center" style={{ marginBottom: 12 }}>
          <QRCode
            value={asset.tag}
            size={160}
            bordered={false}
            color={token.colorText}
            bgColor="transparent"
          />
        </Flex>
        <Text strong style={{ fontSize: 16, display: 'block' }}>
          {asset.tag}
        </Text>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
          {asset.name}
        </Text>
        {asset.serialNumber && (
          <Text code style={{ fontSize: 11, display: 'inline-block', marginTop: 6 }}>
            {asset.serialNumber}
          </Text>
        )}
      </div>
    );
  },
);

PrintableAssetLabel.displayName = 'PrintableAssetLabel';
