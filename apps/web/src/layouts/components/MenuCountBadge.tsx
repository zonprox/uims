import React from 'react';

export interface MenuCountBadgeProps {
  count: number | string;
  color?: string;
  textColor?: string;
}

export const MenuCountBadge: React.FC<MenuCountBadgeProps> = React.memo(
  ({ count, color = '#ef4444', textColor = '#ffffff' }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 18,
        padding: '0 6px',
        borderRadius: 10,
        backgroundColor: color,
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
  ),
);

MenuCountBadge.displayName = 'MenuCountBadge';
