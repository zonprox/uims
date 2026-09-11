import { theme } from 'antd';
import React from 'react';

export interface MenuCountBadgeProps {
  count: number | string;
  color?: string;
  textColor?: string;
}

export const MenuCountBadge: React.FC<MenuCountBadgeProps> = React.memo(
  ({ count, color, textColor = '#ffffff' }) => {
    const { token } = theme.useToken();
    const resolvedColor = color || token.colorError;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 20,
          height: 18,
          padding: '0 6px',
          borderRadius: token.borderRadiusLG,
          backgroundColor: resolvedColor,
          color: textColor,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: '18px',
          flexShrink: 0,
          textAlign: 'center',
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        {count}
      </span>
    );
  },
);

MenuCountBadge.displayName = 'MenuCountBadge';
