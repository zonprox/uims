import { useState, useMemo, type CSSProperties, type ReactNode } from 'react';
import { Button, Card, Collapse, Descriptions, Flex, Result, Space, Typography, theme, App, message as staticMessage } from 'antd';
import type { ResultStatusType } from 'antd/es/result';
import {
  HomeOutlined,
  ReloadOutlined,
  LoginOutlined,
  RedoOutlined,
  CopyOutlined,
  CheckOutlined,
  LaptopOutlined,
  DatabaseOutlined,
  TeamOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { isRouteErrorResponse } from 'react-router';
import { SYSTEM_INFO } from '@uims/shared-utils';

const { Text, Paragraph } = Typography;

export interface ErrorResultViewProps {
  status?: ResultStatusType;
  statusCode?: number | string;
  title?: ReactNode;
  subTitle?: ReactNode;
  error?: unknown;
  errorInfo?: { componentStack?: string | null } | null;
  onReload?: () => void;
  onGoHome?: () => void;
  onSignIn?: () => void;
  onReset?: () => void;
  onNavigate?: (path: string) => void;
  showDiagnostics?: boolean;
  showQuickLinks?: boolean;
  compact?: boolean;
  style?: CSSProperties;
  className?: string;
  extraActions?: ReactNode;
}

export interface SanitizedDiagnostics {
  timestamp: string;
  url: string;
  statusCode?: number | string;
  statusText?: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  componentStack?: string;
}

function safeJsonStringify(value: unknown, space = 2): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') {
          return val.toString();
        }
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      },
      space,
    );
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  // 1. Try modern navigator.clipboard API if available
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Failed (e.g. permission denied or insecure context) - fallback to execCommand below
    }
  }

  // 2. Fallback to document.execCommand('copy')
  if (typeof document !== 'undefined' && document.body) {
    let textarea: HTMLTextAreaElement | null = null;
    try {
      textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const successful = document.execCommand('copy');
      if (successful) return true;
    } catch {
      // Fallback failed
    } finally {
      if (textarea && textarea.parentNode) {
        try {
          textarea.parentNode.removeChild(textarea);
        } catch {
          // Ignore removal error
        }
      }
    }
  }

  return false;
}

export default function ErrorResultView({
  status,
  statusCode,
  title,
  subTitle,
  error,
  errorInfo,
  onReload,
  onGoHome,
  onSignIn,
  onReset,
  onNavigate,
  showDiagnostics = true,
  showQuickLinks,
  compact = false,
  style,
  className,
  extraActions,
}: ErrorResultViewProps) {
  const { token } = theme.useToken();
  const app = App.useApp();
  const [copied, setCopied] = useState(false);

  // Determine numeric or string status code
  const resolvedCode = useMemo(() => {
    if (statusCode !== undefined) {
      const num = Number(statusCode);
      return !isNaN(num) && num > 0 ? num : statusCode;
    }
    if (typeof error === 'number') return error;
    if (isRouteErrorResponse(error)) return error.status;
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      if (typeof errObj.status === 'number') return errObj.status;
      if (typeof errObj.statusCode === 'number') return errObj.statusCode;
      if (typeof errObj.status === 'string' && !isNaN(Number(errObj.status)) && Number(errObj.status) > 0)
        return Number(errObj.status);
      if (typeof errObj.statusCode === 'string' && !isNaN(Number(errObj.statusCode)) && Number(errObj.statusCode) > 0)
        return Number(errObj.statusCode);
      const resp = errObj.response as Record<string, unknown> | undefined;
      if (resp) {
        if (typeof resp.status === 'number') return resp.status;
        if (typeof resp.statusCode === 'number') return resp.statusCode;
        if (typeof resp.status === 'string' && !isNaN(Number(resp.status)) && Number(resp.status) > 0)
          return Number(resp.status);
        if (typeof resp.statusCode === 'string' && !isNaN(Number(resp.statusCode)) && Number(resp.statusCode) > 0)
          return Number(resp.statusCode);
      }
      if (typeof errObj.code === 'number' && errObj.code >= 100 && errObj.code <= 599) return errObj.code;
      if (
        typeof errObj.code === 'string' &&
        !isNaN(Number(errObj.code)) &&
        Number(errObj.code) >= 100 &&
        Number(errObj.code) <= 599
      )
        return Number(errObj.code);
    }
    return undefined;
  }, [statusCode, error]);

  // Determine Ant Design Result status
  const resolvedStatus: ResultStatusType = useMemo(() => {
    if (status) return status;
    if (resolvedCode === 401 || resolvedCode === 403) return '403';
    if (resolvedCode === 404) return '404';
    if (resolvedCode === 500 || (typeof resolvedCode === 'number' && resolvedCode >= 500)) return '500';
    if (typeof resolvedCode === 'number' && resolvedCode >= 400 && resolvedCode < 500) return 'warning';
    return '500';
  }, [status, resolvedCode]);

  // Default Titles
  const resolvedTitle: ReactNode = useMemo(() => {
    if (title) return title;
    if (resolvedCode === 400) return '400 - Bad Request';
    if (resolvedCode === 401) return '401 - Unauthorized';
    if (resolvedCode === 403) return '403 - Access Denied';
    if (resolvedCode === 404) return '404 - Page Not Found';
    if (resolvedCode === 408) return '408 - Request Timeout';
    if (resolvedCode === 422) return '422 - Unprocessable Entity';
    if (resolvedCode === 429) return '429 - Too Many Requests';
    if (resolvedCode === 500) return '500 - Server Error';
    if (resolvedCode === 502) return '502 - Bad Gateway';
    if (resolvedCode === 503) return '503 - Service Unavailable';
    if (resolvedCode === 504) return '504 - Gateway Timeout';
    if (typeof resolvedCode === 'number' && resolvedCode > 500) return `${resolvedCode} - Server Error`;
    if (typeof resolvedCode === 'number') return `${resolvedCode} - Error`;
    return 'Application Error';
  }, [title, resolvedCode]);

  // Default Subtitles
  const resolvedSubTitle: ReactNode = useMemo(() => {
    if (subTitle) return subTitle;
    if (isRouteErrorResponse(error)) {
      if (typeof error.data === 'string' && error.data.trim().length > 0) {
        return error.data;
      }
      if (typeof error.data === 'object' && error.data !== null) {
        const d = error.data as Record<string, unknown>;
        if (typeof d.message === 'string' && d.message.trim()) return d.message;
        if (typeof d.error === 'string' && d.error.trim()) return d.error;
        if (typeof d.detail === 'string' && d.detail.trim()) return d.detail;
        if (typeof d.reason === 'string' && d.reason.trim()) return d.reason;
        if (typeof d.title === 'string' && d.title.trim()) return d.title;
      }
      if (error.statusText) return error.statusText;
    }
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      const resp = errObj.response as Record<string, unknown> | undefined;
      if (resp && typeof resp.data === 'object' && resp.data !== null) {
        const respData = resp.data as Record<string, unknown>;
        if (typeof respData.message === 'string' && respData.message.trim()) return respData.message;
        if (typeof respData.error === 'string' && respData.error.trim()) return respData.error;
        if (typeof respData.detail === 'string' && respData.detail.trim()) return respData.detail;
        if (typeof respData.reason === 'string' && respData.reason.trim()) return respData.reason;
        if (typeof respData.title === 'string' && respData.title.trim()) return respData.title;
      } else if (resp && typeof resp.data === 'string' && resp.data.trim()) {
        return resp.data;
      }
      const directData = errObj.data as Record<string, unknown> | string | undefined;
      if (directData && typeof directData === 'object' && directData !== null) {
        const d = directData as Record<string, unknown>;
        if (typeof d.message === 'string' && d.message.trim()) return d.message;
        if (typeof d.error === 'string' && d.error.trim()) return d.error;
        if (typeof d.detail === 'string' && d.detail.trim()) return d.detail;
        if (typeof d.reason === 'string' && d.reason.trim()) return d.reason;
        if (typeof d.title === 'string' && d.title.trim()) return d.title;
      } else if (typeof directData === 'string' && directData.trim()) {
        return directData;
      }
      if (typeof errObj.message === 'string' && errObj.message.trim()) return errObj.message;
      if (typeof errObj.error === 'string' && errObj.error.trim()) return errObj.error;
      if (typeof errObj.detail === 'string' && errObj.detail.trim()) return errObj.detail;
      if (typeof errObj.reason === 'string' && errObj.reason.trim()) return errObj.reason;
      if (typeof errObj.title === 'string' && errObj.title.trim()) return errObj.title;
      if (typeof errObj.statusText === 'string' && errObj.statusText.trim()) return errObj.statusText;
    }
    if (typeof error === 'string' && error.trim().length > 0) {
      return error;
    }
    if (resolvedCode === 400) {
      return 'The request could not be processed due to invalid parameters or syntax.';
    }
    if (resolvedCode === 401) {
      return 'Your session has expired or you are not signed in. Please sign in again to continue.';
    }
    if (resolvedCode === 403) {
      return 'You do not have permission to access this resource. Contact your administrator to request access.';
    }
    if (resolvedCode === 404) {
      return 'The page or resource you requested could not be located.';
    }
    if (resolvedCode === 408) {
      return 'The server timed out waiting for the request. Please try again.';
    }
    if (resolvedCode === 422) {
      return 'The submitted data failed validation. Please check your inputs and try again.';
    }
    if (resolvedCode === 429) {
      return 'Too many requests were sent in a given amount of time. Please wait a moment and try again.';
    }
    if (resolvedCode === 502) {
      return 'The server encountered a temporary gateway error. Please reload the page or try again later.';
    }
    if (resolvedCode === 503) {
      return 'The service is temporarily unavailable or undergoing maintenance. Please try again shortly.';
    }
    if (resolvedCode === 504) {
      return 'The upstream gateway timed out. Please reload the page or try again shortly.';
    }
    if (resolvedCode === 500 || (typeof resolvedCode === 'number' && resolvedCode >= 500)) {
      return 'An unexpected server error occurred. You can reload the page or return to the dashboard.';
    }
    return 'An unexpected runtime error occurred. You can reload the page or return to the dashboard.';
  }, [subTitle, resolvedCode, error]);

  // Build sanitized diagnostic payload
  const diagnostics: SanitizedDiagnostics = useMemo(() => {
    const err = error instanceof Error ? error : null;
    const isRouteErr = isRouteErrorResponse(error);

    let errMessage: string | undefined;
    let statusText: string | undefined;
    let errorName = 'Error';

    let currentUrl = '';
    if (typeof window !== 'undefined') {
      try {
        currentUrl = window.location?.href || '';
      } catch {
        currentUrl = '';
      }
    }

    if (err?.message) {
      errMessage = err.message;
      errorName = err.name || 'Error';
    } else if (isRouteErr) {
      errorName = 'RouteErrorResponse';
      statusText = error.statusText;
      if (typeof error.data === 'string') {
        errMessage = error.data;
      } else if (typeof error.data === 'object' && error.data !== null) {
        const d = error.data as Record<string, unknown>;
        if (typeof d.message === 'string') errMessage = d.message;
        else if (typeof d.error === 'string') errMessage = d.error;
        else if (typeof d.detail === 'string') errMessage = d.detail;
        else if (typeof d.reason === 'string') errMessage = d.reason;
        else if (typeof d.title === 'string') errMessage = d.title;
        else errMessage = safeJsonStringify(error.data);
      } else {
        errMessage = error.statusText;
      }
    } else if (typeof error === 'string') {
      errMessage = error;
      errorName = 'StringError';
    } else if (typeof error === 'number') {
      errMessage = `HTTP status code ${error} thrown`;
      errorName = 'NumericError';
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      if (typeof errObj.name === 'string') errorName = errObj.name;
      else if (typeof errObj.code === 'string') errorName = errObj.code;
      else errorName = 'ObjectError';

      if (typeof errObj.statusText === 'string') statusText = errObj.statusText;

      const directData = errObj.data as Record<string, unknown> | string | undefined;
      const resp = errObj.response as Record<string, unknown> | undefined;
      const respData = resp?.data as Record<string, unknown> | string | undefined;

      if (typeof respData === 'object' && respData !== null) {
        const d = respData as Record<string, unknown>;
        if (typeof d.message === 'string') errMessage = d.message;
        else if (typeof d.error === 'string') errMessage = d.error;
        else if (typeof d.detail === 'string') errMessage = d.detail;
        else if (typeof d.reason === 'string') errMessage = d.reason;
        else if (typeof d.title === 'string') errMessage = d.title;
        else errMessage = safeJsonStringify(respData);
      } else if (typeof respData === 'string' && respData.trim()) {
        errMessage = respData;
      } else if (typeof directData === 'object' && directData !== null) {
        const d = directData as Record<string, unknown>;
        if (typeof d.message === 'string') errMessage = d.message;
        else if (typeof d.error === 'string') errMessage = d.error;
        else if (typeof d.detail === 'string') errMessage = d.detail;
        else if (typeof d.reason === 'string') errMessage = d.reason;
        else if (typeof d.title === 'string') errMessage = d.title;
        else errMessage = safeJsonStringify(directData);
      } else if (typeof directData === 'string' && directData.trim()) {
        errMessage = directData;
      } else if (typeof errObj.message === 'string' && errObj.message.trim()) {
        errMessage = errObj.message;
      } else if (typeof errObj.error === 'string' && errObj.error.trim()) {
        errMessage = errObj.error;
      } else if (typeof errObj.detail === 'string' && errObj.detail.trim()) {
        errMessage = errObj.detail;
      } else if (typeof errObj.reason === 'string' && errObj.reason.trim()) {
        errMessage = errObj.reason;
      } else if (typeof errObj.title === 'string' && errObj.title.trim()) {
        errMessage = errObj.title;
      } else {
        errMessage = safeJsonStringify(error);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      url: currentUrl,
      statusCode: resolvedCode,
      statusText,
      errorName,
      errorMessage: errMessage,
      stack:
        err?.stack ||
        (typeof error === 'object' &&
        error !== null &&
        'stack' in error &&
        typeof (error as Record<string, unknown>).stack === 'string'
          ? ((error as Record<string, unknown>).stack as string)
          : undefined),
      componentStack: errorInfo?.componentStack || undefined,
    };
  }, [error, errorInfo, resolvedCode]);

  // Copy handler
  const handleCopyDiagnostics = async () => {
    const jsonString = safeJsonStringify(diagnostics, 2);
    const success = await copyTextToClipboard(jsonString);
    if (success) {
      setCopied(true);
      if (app?.message?.success) {
        app.message.success('Diagnostics copied to clipboard');
      } else {
        staticMessage.success('Diagnostics copied to clipboard');
      }
      setTimeout(() => setCopied(false), 2000);
    } else {
      if (app?.message?.error) {
        app.message.error('Failed to copy diagnostics to clipboard');
      } else {
        staticMessage.error('Failed to copy diagnostics to clipboard');
      }
    }
  };

  const handleReload = () => {
    if (onReload) {
      onReload();
    } else if (typeof window !== 'undefined') {
      try {
        window.location.reload();
      } catch {
        // Ignore
      }
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else if (onNavigate) {
      onNavigate('/');
    } else if (typeof window !== 'undefined') {
      try {
        window.location.href = '/';
      } catch {
        // Ignore
      }
    }
  };

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else if (onNavigate) {
      onNavigate('/login');
    } else if (typeof window !== 'undefined') {
      try {
        window.location.href = '/login';
      } catch {
        // Ignore
      }
    }
  };

  const handleNavigatePath = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      try {
        window.location.href = path;
      } catch {
        // Ignore
      }
    }
  };

  const shouldShowQuickLinks = showQuickLinks ?? (resolvedCode === 404 || resolvedStatus === '404');
  const hasDiagnosticData = Boolean(
    diagnostics.errorMessage || diagnostics.stack || diagnostics.componentStack || diagnostics.statusCode,
  );

  const is401 = resolvedCode === 401;
  const is403 = resolvedCode === 403 || (!is401 && resolvedStatus === '403');
  const is404 = resolvedCode === 404 || resolvedStatus === '404';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: compact ? 'auto' : '65vh',
        padding: compact ? '16px' : '24px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <Card
        style={{
          maxWidth: compact ? '100%' : 680,
          width: '100%',
          backgroundColor: token.colorBgContainer,
          borderColor: token.colorBorderSecondary,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
          textAlign: 'center',
        }}
        styles={{
          body: {
            padding: compact ? '20px' : '32px 24px',
          },
        }}
      >
        <Result
          status={resolvedStatus}
          title={resolvedTitle}
          subTitle={resolvedSubTitle}
          extra={
            <Flex vertical gap={20} align="center" style={{ width: '100%' }}>
              <Space wrap size="middle" style={{ justifyContent: 'center' }}>
                {is401 ? (
                  <>
                    <Button type="primary" size="large" icon={<LoginOutlined />} onClick={handleSignIn}>
                      Sign In Again
                    </Button>
                    <Button size="large" icon={<HomeOutlined />} onClick={handleGoHome}>
                      Return to Dashboard
                    </Button>
                    <Button size="large" icon={<ReloadOutlined />} onClick={handleReload}>
                      Reload Page
                    </Button>
                  </>
                ) : is403 ? (
                  <>
                    <Button type="primary" size="large" icon={<HomeOutlined />} onClick={handleGoHome}>
                      Return to Dashboard
                    </Button>
                    <Button size="large" icon={<LoginOutlined />} onClick={handleSignIn}>
                      Sign In Again
                    </Button>
                    <Button size="large" icon={<ReloadOutlined />} onClick={handleReload}>
                      Reload Page
                    </Button>
                  </>
                ) : is404 ? (
                  <>
                    <Button type="primary" size="large" icon={<HomeOutlined />} onClick={handleGoHome}>
                      Return to Dashboard
                    </Button>
                    <Button size="large" icon={<ReloadOutlined />} onClick={handleReload}>
                      Reload Page
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={handleReload}>
                      Reload Page
                    </Button>
                    {onReset && (
                      <Button size="large" icon={<RedoOutlined />} onClick={onReset}>
                        Try Again
                      </Button>
                    )}
                    <Button size="large" icon={<HomeOutlined />} onClick={handleGoHome}>
                      Return to Dashboard
                    </Button>
                    <Button size="large" icon={<LoginOutlined />} onClick={handleSignIn}>
                      Sign In Again
                    </Button>
                  </>
                )}
                {extraActions}
              </Space>

              {shouldShowQuickLinks && (
                <div style={{ marginTop: 4, width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
                    Or jump directly to:
                  </Text>
                  <Space wrap size="small" style={{ justifyContent: 'center' }}>
                    <Button
                      size="small"
                      icon={<LaptopOutlined />}
                      onClick={() => handleNavigatePath('/assets')}
                    >
                      Assets
                    </Button>
                    <Button
                      size="small"
                      icon={<DatabaseOutlined />}
                      onClick={() => handleNavigatePath('/inventory')}
                    >
                      Inventory
                    </Button>
                    <Button
                      size="small"
                      icon={<TeamOutlined />}
                      onClick={() => handleNavigatePath('/users')}
                    >
                      Users & Access
                    </Button>
                  </Space>
                </div>
              )}
            </Flex>
          }
        >
          {showDiagnostics && hasDiagnosticData && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <Collapse
                ghost
                size="small"
                items={[
                  {
                    key: 'diagnostics',
                    label: (
                      <Flex justify="space-between" align="center" style={{ width: '100%', paddingRight: 8 }}>
                        <Space size="small">
                          <CodeOutlined />
                          <Text strong style={{ fontSize: 13 }}>
                            Diagnostic Details
                          </Text>
                        </Space>
                        <Button
                          size="small"
                          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDiagnostics();
                          }}
                        >
                          {copied ? 'Copied' : 'Copy Diagnostics'}
                        </Button>
                      </Flex>
                    ),
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Descriptions
                          size="small"
                          column={1}
                          bordered
                          styles={{
                            label: { width: 140, fontWeight: 500 },
                          }}
                          items={[
                            {
                              key: 'time',
                              label: 'Timestamp',
                              children: diagnostics.timestamp,
                            },
                            {
                              key: 'url',
                              label: 'Location',
                              children: diagnostics.url || 'N/A',
                            },
                            ...(diagnostics.statusCode
                              ? [
                                  {
                                    key: 'status',
                                    label: 'Status Code',
                                    children: `${diagnostics.statusCode}${
                                      diagnostics.statusText ? ` (${diagnostics.statusText})` : ''
                                    }`,
                                  },
                                ]
                              : []),
                            ...(diagnostics.errorName
                              ? [
                                  {
                                    key: 'errorName',
                                    label: 'Error Type',
                                    children: diagnostics.errorName,
                                  },
                                ]
                              : []),
                            ...(diagnostics.errorMessage
                              ? [
                                  {
                                    key: 'message',
                                    label: 'Message',
                                    children: (
                                      <Text type="danger" style={{ wordBreak: 'break-word' }}>
                                        {diagnostics.errorMessage}
                                      </Text>
                                    ),
                                  },
                                ]
                              : []),
                          ]}
                        />

                        {diagnostics.stack && (
                          <div>
                            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                              Stack Trace:
                            </Text>
                            <Paragraph
                              code
                              style={{
                                margin: 0,
                                padding: token.paddingSM,
                                backgroundColor: token.colorFillQuaternary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: token.borderRadiusSM,
                                color: token.colorTextSecondary,
                                fontSize: 11,
                                maxHeight: 180,
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {diagnostics.stack}
                            </Paragraph>
                          </div>
                        )}

                        {diagnostics.componentStack && (
                          <div>
                            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                              Component Stack:
                            </Text>
                            <Paragraph
                              code
                              style={{
                                margin: 0,
                                padding: token.paddingSM,
                                backgroundColor: token.colorFillQuaternary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: token.borderRadiusSM,
                                color: token.colorTextSecondary,
                                fontSize: 11,
                                maxHeight: 140,
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {diagnostics.componentStack}
                            </Paragraph>
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Result>
      </Card>

      {!compact && (
        <Text type="secondary" style={{ fontSize: 12, marginTop: 16 }}>
          {SYSTEM_INFO.footerCredit}
        </Text>
      )}
    </div>
  );
}
