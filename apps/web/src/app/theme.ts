import { theme, type ThemeConfig } from 'antd';
import type { ThemeColorPreset, ThemeMode } from '../stores/theme.store';

interface GetThemeOptions {
  mode: ThemeMode;
  compact: boolean;
  preset: ThemeColorPreset;
  borderRadius: number;
}

export function buildThemeConfig({
  mode,
  compact,
  preset,
  borderRadius,
}: GetThemeOptions): ThemeConfig {
  const isDark = mode === 'dark';

  const algorithms = [];
  if (isDark) {
    algorithms.push(theme.darkAlgorithm);
  } else {
    algorithms.push(theme.defaultAlgorithm);
  }

  if (compact) {
    algorithms.push(theme.compactAlgorithm);
  }

  return {
    algorithm: algorithms,
    token: {
      colorPrimary: preset.primary,
      colorSuccess: preset.success,
      colorWarning: preset.warning,
      colorError: preset.error,
      colorInfo: preset.info,
      borderRadius,
      fontFamily:
        "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: 14,
      wireframe: false,
      // Subtle background colors
      colorBgLayout: isDark ? '#0b0f19' : '#f4f6f9',
      colorBgContainer: isDark ? '#111827' : '#ffffff',
      colorBgElevated: isDark ? '#1f2937' : '#ffffff',
      colorBorderSecondary: isDark ? '#1f2937' : '#eef2f6',
    },
    components: {
      Layout: {
        headerBg: isDark ? '#111827' : '#ffffff',
        headerHeight: 64,
        headerPadding: '0 24px',
        siderBg: isDark ? '#0d131f' : '#001529',
        bodyBg: isDark ? '#0b0f19' : '#f4f6f9',
        footerBg: isDark ? '#0b0f19' : '#f4f6f9',
      },
      Menu: {
        darkItemBg: isDark ? '#0d131f' : '#001529',
        darkSubMenuItemBg: isDark ? '#090d16' : '#000c17',
        darkItemSelectedBg: preset.primary,
        darkItemColor: 'rgba(255, 255, 255, 0.85)',
        itemBorderRadius: 6,
        itemMarginInline: 8,
      },
      Card: {
        headerHeight: 48,
        headerFontSize: 15,
        borderRadiusLG: borderRadius + 2,
        boxShadowTertiary: isDark
          ? '0 1px 3px 0 rgba(0, 0, 0, 0.37), 0 1px 2px -1px rgba(0, 0, 0, 0.37)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
      },
      Table: {
        headerBg: isDark ? '#1a2234' : '#f8fafc',
        headerBorderRadius: borderRadius,
        rowHoverBg: isDark ? '#1f2a3e' : '#f1f5f9',
      },
      Button: {
        controlHeight: 36,
        borderRadius,
        fontWeight: 500,
      },
      Input: {
        controlHeight: 36,
        borderRadius,
      },
      Select: {
        controlHeight: 36,
        borderRadius,
      },
      Tabs: {
        cardGutter: 4,
        horizontalItemPadding: '12px 16px',
      },
      Tag: {
        borderRadiusSM: 4,
      },
      Badge: {
        indicatorHeight: 18,
      },
      Modal: {
        borderRadiusLG: borderRadius + 4,
      },
      Drawer: {
        borderRadiusSM: borderRadius,
      },
    },
  };
}

// Default export for initial load or backward compatibility
export const themeConfig: ThemeConfig = buildThemeConfig({
  mode: 'light',
  compact: false,
  preset: {
    name: 'Geek Blue',
    key: 'blue',
    primary: '#1677ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1677ff',
  },
  borderRadius: 8,
});
