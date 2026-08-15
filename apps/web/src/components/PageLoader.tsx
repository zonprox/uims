import { Flex, Spin, Typography } from 'antd';
import type { FC } from 'react';

const { Text } = Typography;

interface PageLoaderProps {
  tip?: string;
}

export const PageLoader: FC<PageLoaderProps> = ({ tip = 'Loading workspace...' }) => {
  return (
    <Flex
      align="center"
      justify="center"
      vertical
      gap={16}
      style={{
        minHeight: '60vh',
        width: '100%',
        padding: '32px 16px',
      }}
    >
      <Spin size="large" />
      <Text
        style={{
          color: 'rgba(148, 163, 184, 0.9)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        {tip}
      </Text>
    </Flex>
  );
};

export default PageLoader;
