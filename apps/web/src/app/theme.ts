import { theme, type ThemeConfig } from 'antd';
import {
  type ResolvedThemeMode,
  type ThemeColorPreset,
  type ThemeMode,
  resolveThemeMode,
} from '../stores/theme.store';

interface GetThemeOptions {
  mode: ThemeMode;
  resolvedMode?: ResolvedThemeMode;
  compact: boolean;
  preset: ThemeColorPreset;
  borderRadius: number;
}

function getThemeTokens(isDark: boolean, preset: ThemeColorPreset, borderRadius: number) {
  return {
    colorPrimary: preset.primary,
    colorSuccess: preset.success,
    colorWarning: preset.warning,
    colorError: preset.error,
    colorInfo: preset.info,
    borderRadius,
    fontFamily:
      "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 13.5,
    wireframe: false,
    colorBgLayout: isDark ? '#090d16' : '#f8fafc',
    colorBgContainer: isDark ? '#0f172a' : '#ffffff',
    colorBgElevated: isDark ? '#1e293b' : '#ffffff',
    colorBorder: isDark ? '#1e293b' : '#e2e8f0',
    colorBorderSecondary: isDark ? '#172033' : '#f1f5f9',
    colorText: isDark ? '#f8fafc' : '#0f172a',
    colorTextSecondary: isDark ? '#94a3b8' : '#475569',
    colorTextTertiary: isDark ? '#64748b' : '#94a3b8',
  };
}

function getComponentThemes(isDark: boolean, preset: ThemeColorPreset, borderRadius: number) {
  return {
    Layout: {
      headerBg: isDark ? '#0f172a' : '#ffffff',
      headerHeight: 56,
      headerPadding: '0 20px',
      siderBg: isDark ? '#080c14' : '#ffffff',
      bodyBg: isDark ? '#090d16' : '#f8fafc',
      footerBg: isDark ? '#090d16' : '#f8fafc',
    },
    Menu: {
      darkItemBg: '#080c14',
      darkSubMenuItemBg: '#060910',
      darkItemSelectedBg: preset.primary,
      darkItemColor: 'rgba(248, 250, 252, 0.75)',
      darkItemSelectedColor: '#ffffff',
      itemBg: isDark ? '#080c14' : '#ffffff',
      subMenuItemBg: isDark ? '#060910' : '#f8fafc',
      itemSelectedBg: isDark ? preset.primary : `${preset.primary}18`,
      itemColor: isDark ? 'rgba(248, 250, 252, 0.75)' : '#334155',
      itemSelectedColor: isDark ? '#ffffff' : preset.primary,
      itemHoverBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      itemHoverColor: isDark ? '#ffffff' : preset.primary,
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemMarginBlock: 2,
      itemHeight: 38,
      iconMarginInlineEnd: 8,
      iconSize: 15,
      collapsedWidth: 80,
      collapsedIconSize: 16,
      fontSize: 13,
    },
    Card: {
      headerHeight: 44,
      headerFontSize: 14,
      borderRadiusLG: borderRadius,
      paddingLG: 18,
    },
    Table: {
      headerBg: isDark ? '#131c2e' : '#f8fafc',
      headerColor: isDark ? '#94a3b8' : '#64748b',
      headerBorderRadius: borderRadius,
      rowHoverBg: isDark ? '#1e293b' : '#f1f5f9',
      borderColor: isDark ? '#1e293b' : '#f1f5f9',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      fontSize: 13,
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
    DatePicker: {
      controlHeight: 36,
      borderRadius,
    },
    Tabs: {
      titleFontSize: 14,
      titleFontSizeLG: 14,
      titleFontSizeSM: 13,
      horizontalItemPadding: '10px 16px',
      itemSelectedColor: preset.primary,
      inkBarColor: preset.primary,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Badge: {
      indicatorHeight: 18,
    },
    Modal: {
      borderRadiusLG: borderRadius + 2,
    },
    Drawer: {
      borderRadiusSM: borderRadius,
    },
    Segmented: {
      borderRadius,
    },
  };
}

export function buildThemeConfig({
  mode,
  resolvedMode,
  compact,
  preset,
  borderRadius,
}: GetThemeOptions): ThemeConfig {
  const isDark = (resolvedMode ?? resolveThemeMode(mode)) === 'dark';
  const algorithms = [isDark ? theme.darkAlgorithm : theme.defaultAlgorithm];

  if (compact) {
    algorithms.push(theme.compactAlgorithm);
  }

  return {
    algorithm: algorithms,
    token: getThemeTokens(isDark, preset, borderRadius),
    components: getComponentThemes(isDark, preset, borderRadius),
  };
}

export const themeConfig: ThemeConfig = buildThemeConfig({
  mode: 'light',
  compact: false,
  preset: {
    name: 'Enterprise Blue',
    key: 'blue',
    primary: '#1677ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#1677ff',
  },
  borderRadius: 6,
});
