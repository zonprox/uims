import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result, Typography, Space, Card } from 'antd';
import { ReloadOutlined, HomeOutlined, WarningOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  title?: string;
  subTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            padding: '24px',
          }}
        >
          <Card
            style={{
              maxWidth: 640,
              width: '100%',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Result
              status="warning"
              icon={<WarningOutlined style={{ color: '#faad14' }} />}
              title={this.props.title || 'Something went wrong'}
              subTitle={
                this.props.subTitle ||
                'An unexpected error occurred while rendering this view. You can try recovering or return to the main dashboard.'
              }
              extra={
                <Space wrap size="middle">
                  <Button type="primary" onClick={this.handleReset}>
                    Try Again
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={this.handleReload}>
                    Reload Page
                  </Button>
                  <Button icon={<HomeOutlined />} onClick={this.handleGoHome}>
                    Dashboard
                  </Button>
                </Space>
              }
            >
              {this.state.error && (
                <div style={{ textAlign: 'left', marginTop: 16 }}>
                  <Paragraph>
                    <Text strong>Error Details:</Text>
                  </Paragraph>
                  <Paragraph
                    code
                    ellipsis={{ rows: 3, expandable: 'collapsible', symbol: 'more' }}
                    style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}
                  >
                    {this.state.error.message}
                  </Paragraph>
                </div>
              )}
            </Result>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
