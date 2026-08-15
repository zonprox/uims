import React from 'react';

export interface NavIconWithBadgeProps {
  icon: React.ReactNode;
  count?: number;
  dot?: boolean;
  color?: string;
  textColor?: string;
  isCollapsed: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const NavIconWithBadge: React.FC<NavIconWithBadgeProps> = React.memo(
  ({
    icon,
    count,
    dot,
    color = '#ef4444',
    textColor = '#ffffff',
    isCollapsed,
    className,
    style,
  }) => {
    if (!isCollapsed || (!count && !dot)) {
      return (
        <span
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...style,
          }}
        >
          {icon}
        </span>
      );
    }

    return (
      <span
        className={className}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {icon}
        {dot && !count && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: color,
              border: '1.5px solid #0c1017',
            }}
          />
        )}
        {Boolean(count) && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              right: -7,
              minWidth: 14,
              height: 14,
              padding: '0 3px',
              borderRadius: 7,
              backgroundColor: color,
              color: textColor,
              fontSize: 9,
              fontWeight: 800,
              lineHeight: '13px',
              textAlign: 'center',
              border: '1.5px solid #0c1017',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {count}
          </span>
        )}
      </span>
    );
  },
);

NavIconWithBadge.displayName = 'NavIconWithBadge';
