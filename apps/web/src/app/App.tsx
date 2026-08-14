import { QueryClientProvider } from '@tanstack/react-query';
import { ProConfigProvider, enUSIntl } from '@ant-design/pro-components';
import { App as AntApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import { useMemo } from 'react';
import { RouterProvider } from 'react-router';
import { useThemeStore } from '../stores/theme.store';
import { queryClient } from './query-client';
import { router } from './router';
import { buildThemeConfig } from './theme';

dayjs.locale('en');

export default function App() {
  const mode = useThemeStore((state) => state.mode);
  const compact = useThemeStore((state) => state.compact);
  const borderRadius = useThemeStore((state) => state.borderRadius);
  const getCurrentPreset = useThemeStore((state) => state.getCurrentPreset);

  const preset = getCurrentPreset();

  const themeConfig = useMemo(() => {
    return buildThemeConfig({
      mode,
      compact,
      preset,
      borderRadius,
    });
  }, [mode, compact, preset, borderRadius]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={enUS} theme={themeConfig}>
        <ProConfigProvider intl={enUSIntl}>
          <AntApp>
            <RouterProvider router={router} />
          </AntApp>
        </ProConfigProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
