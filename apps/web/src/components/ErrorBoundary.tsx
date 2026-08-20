import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useAuthStore } from '../stores/auth.store';
import ErrorResultView from './ErrorResultView';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onGoHome?: () => void;
  onSignIn?: () => void;
  title?: string;
  subTitle?: string;
  compact?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  rawError?: unknown;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    rawError: undefined,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    let message = 'An unexpected application error occurred.';

    if (error instanceof Error && error.message?.trim()) {
      message = error.message;
    } else if (typeof error === 'string' && error.trim().length > 0) {
      message = error;
    } else if (typeof error === 'object' && error !== null) {
      const obj = error as Record<string, unknown>;
      const resp = obj.response as Record<string, unknown> | undefined;
      const respData = resp?.data as Record<string, unknown> | string | undefined;
      const directData = obj.data as Record<string, unknown> | string | undefined;

      const extracted =
        (typeof respData === 'object' && respData !== null
          ? (respData.message as string | undefined) ||
            (respData.error as string | undefined) ||
            (respData.detail as string | undefined) ||
            (respData.reason as string | undefined) ||
            (respData.title as string | undefined)
          : typeof respData === 'string' && respData.trim().length > 0
            ? respData
            : undefined) ||
        (typeof directData === 'object' && directData !== null
          ? (directData.message as string | undefined) ||
            (directData.error as string | undefined) ||
            (directData.detail as string | undefined) ||
            (directData.reason as string | undefined) ||
            (directData.title as string | undefined)
          : typeof directData === 'string' && directData.trim().length > 0
            ? directData
            : undefined) ||
        (typeof obj.message === 'string' && obj.message.trim().length > 0
          ? obj.message
          : typeof obj.error === 'string' && obj.error.trim().length > 0
            ? obj.error
            : typeof obj.detail === 'string' && obj.detail.trim().length > 0
              ? obj.detail
              : typeof obj.reason === 'string' && obj.reason.trim().length > 0
                ? obj.reason
                : undefined);

      if (extracted) {
        message = extracted;
      }
    }

    const normalizedError = error instanceof Error ? error : new Error(message);

    return {
      hasError: true,
      error: normalizedError,
      rawError: error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('Unhandled UI exception caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, rawError: undefined, errorInfo: null });
    this.props.onReset?.();
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      try {
        window.location.reload();
      } catch {
        // Safe fallback
      }
    }
  };

  private handleGoHome = () => {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else if (typeof window !== 'undefined') {
      try {
        window.location.href = '/';
      } catch {
        // Safe fallback
      }
    }
  };

  private handleSignIn = () => {
    try {
      useAuthStore.getState().logout();
    } catch {
      // Ignore if store is not accessible
    }
    if (this.props.onSignIn) {
      this.props.onSignIn();
    } else if (typeof window !== 'undefined') {
      try {
        window.location.href = '/login';
      } catch {
        // Safe fallback
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      const currentError =
        this.state.rawError !== undefined && this.state.rawError !== null
          ? this.state.rawError
          : this.state.error || new Error('An unexpected application error occurred.');

      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(
          this.state.error || new Error('An unexpected application error occurred.'),
          this.handleReset,
        );
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorResultView
          title={this.props.title}
          subTitle={this.props.subTitle}
          error={currentError}
          errorInfo={this.state.errorInfo}
          compact={this.props.compact}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          onSignIn={this.handleSignIn}
          showDiagnostics={true}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
