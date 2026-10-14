import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Empty, Flex, Tag, Typography, theme } from 'antd';
import React, { useMemo, useState } from 'react';

const { Text } = Typography;

export interface FieldDiffViewerProps {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  diffPayload?: Record<string, unknown> | null;
  className?: string;
  style?: React.CSSProperties;
}

export interface DiffEntry {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

const METADATA_KEYS = new Set(['createdAt', 'updatedAt', 'id']);

export function safeJsonStringify(val: unknown, indent = 2): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      val,
      (_key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      },
      indent,
    );
  } catch (_err: unknown) {
    return String(val);
  }
}

export function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val === 'object') {
    return safeJsonStringify(val, 0);
  }
  return String(val);
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null && b === undefined) return true;
  if (a === undefined && b === null) return true;

  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    try {
      return safeJsonStringify(a) === safeJsonStringify(b);
    } catch (_err: unknown) {
      return false;
    }
  }

  return false;
}

export function computeDiffEntries(
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null,
  diffPayload?: Record<string, unknown> | null,
): DiffEntry[] {
  const oldObj = oldValue && typeof oldValue === 'object' ? oldValue : {};
  const newObj = newValue && typeof newValue === 'object' ? newValue : {};
  const payloadObj = diffPayload && typeof diffPayload === 'object' ? diffPayload : {};

  const rawKeys = new Set<string>([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const nonMetaKeys = Array.from(rawKeys).filter((k) => !METADATA_KEYS.has(k));

  const allKeys = new Set<string>(rawKeys);

  if (nonMetaKeys.length === 0 && Object.keys(payloadObj).length > 0) {
    for (const k of Object.keys(payloadObj)) {
      allKeys.add(k);
    }
  }

  const entries: DiffEntry[] = [];

  for (const key of allKeys) {
    if (METADATA_KEYS.has(key)) {
      continue;
    }

    let oldVal = oldObj[key];
    let newVal = newObj[key];

    // If both undefined in state snapshots, check diffPayload
    if (oldVal === undefined && newVal === undefined && payloadObj[key] !== undefined) {
      const payloadVal = payloadObj[key];
      if (
        typeof payloadVal === 'object' &&
        payloadVal !== null &&
        ('old' in payloadVal || 'new' in payloadVal)
      ) {
        const payloadRecord = payloadVal as { old?: unknown; new?: unknown };
        oldVal = payloadRecord.old;
        newVal = payloadRecord.new;
      } else {
        newVal = payloadVal;
      }
    }

    if (!areValuesEqual(oldVal, newVal)) {
      entries.push({
        key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export const FieldDiffViewer: React.FC<FieldDiffViewerProps> = React.memo(
  ({ oldValue, newValue, diffPayload, className, style }) => {
    const { token } = theme.useToken();
    const [showRawJson, setShowRawJson] = useState(false);

    const diffEntries = useMemo(() => {
      return computeDiffEntries(oldValue, newValue, diffPayload);
    }, [oldValue, newValue, diffPayload]);

    const rawJsonPayload = useMemo(() => {
      if (diffPayload && Object.keys(diffPayload).length > 0) {
        return diffPayload;
      }
      if (oldValue || newValue) {
        return {
          ...(oldValue ? { oldValue } : {}),
          ...(newValue ? { newValue } : {}),
        };
      }
      return {};
    }, [diffPayload, oldValue, newValue]);

    const hasAnyPayload =
      (oldValue && Object.keys(oldValue).length > 0) ||
      (newValue && Object.keys(newValue).length > 0) ||
      (diffPayload && Object.keys(diffPayload).length > 0);

    return (
      <div className={className} style={{ width: '100%', ...style }}>
        {diffEntries.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No field differences detected"
            style={{ margin: '8px 0' }}
          />
        ) : (
          <Flex vertical gap={6}>
            {diffEntries.map((diff) => (
              <Flex
                key={diff.key}
                align="center"
                gap={6}
                wrap="wrap"
                style={{ fontSize: token.fontSizeSM }}
              >
                <Text code strong style={{ fontSize: token.fontSizeSM }}>
                  {diff.key}:
                </Text>
                <Tag
                  color="error"
                  style={{
                    textDecoration: 'line-through',
                    margin: 0,
                    fontSize: token.fontSizeSM,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  -{formatDiffValue(diff.oldValue)}
                </Tag>
                <span
                  style={{
                    color: token.colorTextTertiary,
                    fontSize: token.fontSizeSM,
                  }}
                >
                  -&gt;
                </span>
                <Tag
                  color="success"
                  style={{
                    margin: 0,
                    fontSize: token.fontSizeSM,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  +{formatDiffValue(diff.newValue)}
                </Tag>
              </Flex>
            ))}
          </Flex>
        )}

        {hasAnyPayload && (
          <div style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              icon={showRawJson ? <DownOutlined /> : <RightOutlined />}
              onClick={() => setShowRawJson((prev) => !prev)}
              style={{ padding: 0, height: 'auto', fontSize: token.fontSizeSM }}
            >
              {showRawJson ? 'Hide Formatted JSON' : 'View Formatted JSON'}
            </Button>

            {showRawJson && (
              <pre
                style={{
                  background: token.colorFillAlter,
                  color: token.colorText,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusSM,
                  padding: token.paddingSM,
                  fontSize: token.fontSizeSM,
                  fontFamily: token.fontFamilyCode || 'monospace',
                  overflowX: 'auto',
                  marginTop: 6,
                  marginBottom: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {safeJsonStringify(rawJsonPayload, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  },
);

FieldDiffViewer.displayName = 'FieldDiffViewer';
export default FieldDiffViewer;
