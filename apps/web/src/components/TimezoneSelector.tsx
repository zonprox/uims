import { GlobalOutlined } from '@ant-design/icons';
import type { TimezoneRegion } from '@uims/shared-types';
import { getTimezoneOptions } from '@uims/shared-utils';
import { Flex, Select, type SelectProps, Tag, Typography } from 'antd';
import React, { useMemo } from 'react';

const { Text } = Typography;

export interface TimezoneSelectorProps extends Omit<SelectProps<string>, 'options'> {
  showRegionHeaders?: boolean;
  compact?: boolean;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = React.memo(
  ({ showRegionHeaders = true, compact = false, style, ...selectProps }) => {
    const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

    const groupedOptions = useMemo(() => {
      if (!showRegionHeaders) {
        return timezoneOptions.map((tz) => ({
          label: (
            <Flex justify="space-between" align="center">
              <span>{tz.label}</span>
              <Tag style={{ margin: 0, fontSize: 10 }}>{tz.region}</Tag>
            </Flex>
          ),
          value: tz.value,
          searchValue:
            `${tz.value} ${tz.name} ${tz.region} ${tz.offset} ${tz.abbr || ''}`.toLowerCase(),
        }));
      }

      const regions: TimezoneRegion[] = [
        'UTC',
        'Asia',
        'Americas',
        'Europe',
        'Australia',
        'Pacific',
        'Africa',
      ];

      return regions
        .map((region) => {
          const items = timezoneOptions.filter((tz) => tz.region === region);
          if (items.length === 0) return null;

          return {
            label: (
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  color: '#8c8c8c',
                  textTransform: 'uppercase',
                }}
              >
                {region === 'UTC' ? 'Universal / Standard' : region}
              </span>
            ),
            options: items.map((tz) => ({
              label: (
                <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                  <Text ellipsis style={{ maxWidth: compact ? 220 : 380, fontSize: 12.5 }}>
                    {tz.label}
                  </Text>
                  <Tag
                    color={region === 'UTC' ? 'purple' : region === 'Asia' ? 'blue' : 'default'}
                    style={{ margin: 0, fontSize: 10.5, lineHeight: '18px', height: 18 }}
                  >
                    UTC{tz.offset}
                  </Tag>
                </Flex>
              ),
              value: tz.value,
              searchValue:
                `${tz.value} ${tz.name} ${tz.region} ${tz.offset} ${tz.abbr || ''}`.toLowerCase(),
            })),
          };
        })
        .filter(Boolean);
    }, [timezoneOptions, showRegionHeaders, compact]);

    return (
      <Select
        showSearch
        placeholder="Select IANA Timezone (e.g. Asia/Ho_Chi_Minh, America/New_York)"
        optionFilterProp="searchValue"
        filterOption={(input, option) => {
          const searchVal = (option as { searchValue?: string })?.searchValue || '';
          const terms = input.toLowerCase().trim().split(/\s+/);
          return terms.every((t) => searchVal.includes(t));
        }}
        options={groupedOptions as SelectProps['options']}
        style={{ width: '100%', ...style }}
        suffixIcon={<GlobalOutlined style={{ color: '#94a3b8' }} />}
        {...selectProps}
      />
    );
  },
);

TimezoneSelector.displayName = 'TimezoneSelector';
