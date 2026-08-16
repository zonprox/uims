import { ClockCircleOutlined } from '@ant-design/icons';
import type { DateFormatPattern } from '@uims/shared-types';
import { Tooltip, Typography } from 'antd';
import React from 'react';
import { useTimezoneStore } from '../stores/timezone.store';

const { Text } = Typography;

export interface FormattedDateProps {
  date: string | number | Date | null | undefined;
  format?: DateFormatPattern | string;
  className?: string;
  style?: React.CSSProperties;
}

export const FormattedDate: React.FC<FormattedDateProps> = React.memo(
  ({ date, format, className, style }) => {
    const formatDate = useTimezoneStore((state) => state.formatDate);
    const timezone = useTimezoneStore((state) => state.getEffectiveTimezone());

    if (!date)
      return (
        <Text type="secondary" style={style}>
          -
        </Text>
      );

    const formatted = formatDate(date, format);

    return (
      <Tooltip title={`Timezone: ${timezone}`}>
        <span className={className} style={style}>
          {formatted}
        </span>
      </Tooltip>
    );
  },
);

FormattedDate.displayName = 'FormattedDate';

export interface FormattedDateTimeProps {
  date: string | number | Date | null | undefined;
  format?: DateFormatPattern | string;
  showOffset?: boolean;
  showTimezone?: boolean;
  showIcon?: boolean;
  monospace?: boolean;
  style?: React.CSSProperties;
}

export const FormattedDateTime: React.FC<FormattedDateTimeProps> = React.memo(
  ({
    date,
    format,
    showOffset = false,
    showTimezone = false,
    showIcon = false,
    monospace = true,
    style,
  }) => {
    const formatDateTime = useTimezoneStore((state) => state.formatDateTime);
    const timezone = useTimezoneStore((state) => state.getEffectiveTimezone());
    const timezoneInfo = useTimezoneStore((state) => state.getTimezoneInfo());

    if (!date)
      return (
        <Text type="secondary" style={style}>
          -
        </Text>
      );

    const formatted = formatDateTime(date, {
      format,
      showOffset,
      showTimezone,
    });

    const utcIso = new Date(date).toISOString();

    const tooltipContent = (
      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
        <div>
          <Text strong style={{ color: '#fff' }}>
            Local ({timezoneInfo.abbr}):
          </Text>{' '}
          {formatted}
        </div>
        <div style={{ color: '#94a3b8' }}>
          <Text strong style={{ color: '#94a3b8' }}>
            Timezone:
          </Text>{' '}
          {timezone} (UTC{timezoneInfo.offset})
        </div>
        <div style={{ color: '#94a3b8' }}>
          <Text strong style={{ color: '#94a3b8' }}>
            UTC (ISO):
          </Text>{' '}
          {utcIso}
        </div>
      </div>
    );

    return (
      <Tooltip title={tooltipContent}>
        <span
          style={{
            fontFamily: monospace ? 'monospace, var(--font-mono, monospace)' : 'inherit',
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            ...style,
          }}
        >
          {showIcon && <ClockCircleOutlined style={{ fontSize: 11, color: '#94a3b8' }} />}
          {formatted}
        </span>
      </Tooltip>
    );
  },
);

FormattedDateTime.displayName = 'FormattedDateTime';

export interface TimeAgoProps {
  date: string | number | Date | null | undefined;
  showIcon?: boolean;
  style?: React.CSSProperties;
}

export const TimeAgo: React.FC<TimeAgoProps> = React.memo(({ date, showIcon = false, style }) => {
  const fromNow = useTimezoneStore((state) => state.fromNow);
  const formatDateTime = useTimezoneStore((state) => state.formatDateTime);
  const timezone = useTimezoneStore((state) => state.getEffectiveTimezone());

  if (!date)
    return (
      <Text type="secondary" style={style}>
        -
      </Text>
    );

  const relativeText = fromNow(date);
  const exactText = formatDateTime(date, { showOffset: true, showTimezone: true });
  const utcIso = new Date(date).toISOString();

  const tooltipContent = (
    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
      <div>
        <Text strong style={{ color: '#fff' }}>
          Exact:
        </Text>{' '}
        {exactText}
      </div>
      <div style={{ color: '#94a3b8' }}>
        <Text strong style={{ color: '#94a3b8' }}>
          Timezone:
        </Text>{' '}
        {timezone}
      </div>
      <div style={{ color: '#94a3b8' }}>
        <Text strong style={{ color: '#94a3b8' }}>
          UTC:
        </Text>{' '}
        {utcIso}
      </div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          cursor: 'help',
          ...style,
        }}
      >
        {showIcon && <ClockCircleOutlined style={{ fontSize: 11, color: '#94a3b8' }} />}
        {relativeText}
      </span>
    </Tooltip>
  );
});

TimeAgo.displayName = 'TimeAgo';
