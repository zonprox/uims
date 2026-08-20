import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router';
import { useAuthStore } from '../stores/auth.store';
import ErrorResultView from './ErrorResultView';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();

  let statusCode: number | string | undefined;
  let status: '403' | '404' | '500' | 'error' | 'warning' = '500';
  let title = 'Application Error';
  let subTitle =
    'An unexpected error occurred while loading this page. You can reload the page or return to the dashboard.';

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    const errorData = error.data;
    const msgFromData =
      typeof errorData === 'string' && errorData.trim().length > 0
        ? errorData
        : typeof errorData === 'object' && errorData !== null
          ? ((errorData as Record<string, unknown>).message as string | undefined) ||
            ((errorData as Record<string, unknown>).error as string | undefined) ||
            ((errorData as Record<string, unknown>).detail as string | undefined) ||
            ((errorData as Record<string, unknown>).reason as string | undefined) ||
            ((errorData as Record<string, unknown>).title as string | undefined)
          : undefined;

    if (error.status === 400) {
      status = 'error';
      title = '400 - Bad Request';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'The request could not be processed due to invalid parameters or syntax.';
    } else if (error.status === 401) {
      status = '403';
      title = '401 - Unauthorized';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'Your session has expired or you are not signed in. Please sign in again to continue.';
    } else if (error.status === 403) {
      status = '403';
      title = '403 - Access Denied';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'You do not have permission to access this resource. Contact your administrator to request access.';
    } else if (error.status === 404) {
      status = '404';
      title = '404 - Page Not Found';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'The page or resource you requested could not be located.';
    } else if (error.status === 408) {
      status = 'warning';
      title = '408 - Request Timeout';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'The server timed out waiting for the request. Please try again.';
    } else if (error.status === 422) {
      status = 'warning';
      title = '422 - Unprocessable Entity';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'The submitted data failed validation. Please check your inputs and try again.';
    } else if (error.status === 429) {
      status = 'warning';
      title = '429 - Too Many Requests';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'Too many requests were sent in a given amount of time. Please wait a moment and try again.';
    } else if (error.status === 502) {
      status = '500';
      title = '502 - Bad Gateway';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'The server encountered a temporary gateway error. Please reload the page or try again later.';
    } else if (error.status === 503) {
      status = '500';
      title = '503 - Service Unavailable';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'The service is temporarily unavailable or undergoing maintenance. Please try again shortly.';
    } else if (error.status === 504) {
      status = '500';
      title = '504 - Gateway Timeout';
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'The upstream gateway timed out. Please reload the page or try again shortly.';
    } else if (error.status >= 500) {
      status = '500';
      title = `${error.status} - Server Error`;
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'An unexpected server error occurred. You can reload the page or return to the dashboard.';
    } else {
      status = 'error';
      title = `${error.status} - ${error.statusText || 'Request Error'}`;
      subTitle =
        (typeof msgFromData === 'string' && msgFromData) ||
        'An unexpected error occurred while processing your request.';
    }
  } else if (typeof error === 'number') {
    statusCode = error;
    if (error === 400) {
      status = 'error';
      title = '400 - Bad Request';
      subTitle = 'The request could not be processed due to invalid parameters or syntax.';
    } else if (error === 401) {
      status = '403';
      title = '401 - Unauthorized';
      subTitle = 'Your session has expired or you are not signed in. Please sign in again to continue.';
    } else if (error === 403) {
      status = '403';
      title = '403 - Access Denied';
      subTitle = 'You do not have permission to access this resource. Contact your administrator to request access.';
    } else if (error === 404) {
      status = '404';
      title = '404 - Page Not Found';
      subTitle = 'The page or resource you requested could not be located.';
    } else if (error === 408) {
      status = 'warning';
      title = '408 - Request Timeout';
      subTitle = 'The server timed out waiting for the request. Please try again.';
    } else if (error === 422) {
      status = 'warning';
      title = '422 - Unprocessable Entity';
      subTitle = 'The submitted data failed validation. Please check your inputs and try again.';
    } else if (error === 429) {
      status = 'warning';
      title = '429 - Too Many Requests';
      subTitle = 'Too many requests were sent in a given amount of time. Please wait a moment and try again.';
    } else if (error === 502) {
      status = '500';
      title = '502 - Bad Gateway';
      subTitle = 'The server encountered a temporary gateway error. Please reload the page or try again later.';
    } else if (error === 503) {
      status = '500';
      title = '503 - Service Unavailable';
      subTitle = 'The service is temporarily unavailable or undergoing maintenance. Please try again shortly.';
    } else if (error === 504) {
      status = '500';
      title = '504 - Gateway Timeout';
      subTitle = 'The upstream gateway timed out. Please reload the page or try again shortly.';
    } else if (error >= 500) {
      status = '500';
      title = `${error} - Server Error`;
      subTitle = 'An unexpected server error occurred. You can reload the page or return to the dashboard.';
    } else {
      status = 'error';
      title = `${error} - Request Error`;
      subTitle = 'An unexpected error occurred while processing your request.';
    }
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    const resp = errObj.response as Record<string, unknown> | undefined;
    const respData = resp?.data as Record<string, unknown> | string | undefined;
    const directData = errObj.data as Record<string, unknown> | string | undefined;

    const code =
      typeof errObj.status === 'number'
        ? errObj.status
        : typeof errObj.statusCode === 'number'
          ? errObj.statusCode
          : typeof resp?.status === 'number'
            ? resp.status
            : typeof resp?.statusCode === 'number'
              ? resp.statusCode
              : typeof errObj.status === 'string' && !isNaN(Number(errObj.status)) && Number(errObj.status) > 0
                ? Number(errObj.status)
                : typeof errObj.statusCode === 'string' && !isNaN(Number(errObj.statusCode)) && Number(errObj.statusCode) > 0
                  ? Number(errObj.statusCode)
                  : typeof resp?.status === 'string' && !isNaN(Number(resp?.status)) && Number(resp?.status) > 0
                    ? Number(resp?.status)
                    : typeof resp?.statusCode === 'string' && !isNaN(Number(resp?.statusCode)) && Number(resp?.statusCode) > 0
                      ? Number(resp?.statusCode)
                      : typeof errObj.code === 'number' && errObj.code >= 100 && errObj.code <= 599
                        ? errObj.code
                        : typeof errObj.code === 'string' &&
                            !isNaN(Number(errObj.code)) &&
                            Number(errObj.code) >= 100 &&
                            Number(errObj.code) <= 599
                          ? Number(errObj.code)
                          : undefined;

    const msg =
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
      (typeof errObj.message === 'string' && errObj.message.trim().length > 0
        ? errObj.message
        : typeof errObj.error === 'string' && errObj.error.trim().length > 0
          ? errObj.error
          : typeof errObj.detail === 'string' && errObj.detail.trim().length > 0
            ? errObj.detail
            : typeof errObj.reason === 'string' && errObj.reason.trim().length > 0
              ? errObj.reason
              : typeof errObj.title === 'string' && errObj.title.trim().length > 0
                ? errObj.title
                : typeof errObj.statusText === 'string' && errObj.statusText.trim().length > 0
                  ? errObj.statusText
                  : undefined);

    if (code === 400) {
      statusCode = 400;
      status = 'error';
      title = '400 - Bad Request';
      subTitle = msg || 'The request could not be processed due to invalid parameters or syntax.';
    } else if (code === 401) {
      statusCode = 401;
      status = '403';
      title = '401 - Unauthorized';
      subTitle = msg || 'Your session has expired or you are not signed in. Please sign in again to continue.';
    } else if (code === 403) {
      statusCode = 403;
      status = '403';
      title = '403 - Access Denied';
      subTitle = msg || 'You do not have permission to access this resource. Contact your administrator to request access.';
    } else if (code === 404) {
      statusCode = 404;
      status = '404';
      title = '404 - Page Not Found';
      subTitle = msg || 'The page or resource you requested could not be located.';
    } else if (code === 408) {
      statusCode = 408;
      status = 'warning';
      title = '408 - Request Timeout';
      subTitle = msg || 'The server timed out waiting for the request. Please try again.';
    } else if (code === 422) {
      statusCode = 422;
      status = 'warning';
      title = '422 - Unprocessable Entity';
      subTitle = msg || 'The submitted data failed validation. Please check your inputs and try again.';
    } else if (code === 429) {
      statusCode = 429;
      status = 'warning';
      title = '429 - Too Many Requests';
      subTitle = msg || 'Too many requests were sent in a given amount of time. Please wait a moment and try again.';
    } else if (code === 502) {
      statusCode = 502;
      status = '500';
      title = '502 - Bad Gateway';
      subTitle = msg || 'The server encountered a temporary gateway error. Please reload the page or try again later.';
    } else if (code === 503) {
      statusCode = 503;
      status = '500';
      title = '503 - Service Unavailable';
      subTitle = msg || 'The service is temporarily unavailable or undergoing maintenance. Please try again shortly.';
    } else if (code === 504) {
      statusCode = 504;
      status = '500';
      title = '504 - Gateway Timeout';
      subTitle = msg || 'The upstream gateway timed out. Please reload the page or try again shortly.';
    } else if (code && code >= 500) {
      statusCode = code;
      status = '500';
      title = `${code} - Server Error`;
      subTitle = msg || 'An unexpected server error occurred. You can reload the page or return to the dashboard.';
    } else if (code) {
      statusCode = code;
      status = 'error';
      title = `${code} - ${typeof errObj.statusText === 'string' ? errObj.statusText : (errObj.name as string) || 'Request Error'}`;
      subTitle = msg || 'An unexpected error occurred while processing your request.';
    } else if (error instanceof Error) {
      statusCode = 500;
      status = '500';
      title = 'Application Error';
      subTitle = error.message || 'An unexpected runtime error occurred while rendering this page.';
    } else {
      statusCode = 500;
      status = '500';
      title = 'Application Error';
      subTitle = msg || 'An unexpected runtime error occurred while rendering this page.';
    }
  } else if (typeof error === 'string') {
    statusCode = 500;
    status = '500';
    title = 'Application Error';
    subTitle = error;
  }

  const handleGoHome = () => {
    navigate('/');
  };

  const handleSignIn = () => {
    try {
      useAuthStore.getState().logout();
    } catch {
      // Ignore if store is not accessible
    }
    navigate('/login', { state: { from: location } });
  };

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      try {
        window.location.reload();
      } catch {
        // Ignore
      }
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <ErrorResultView
      status={status}
      statusCode={statusCode}
      title={title}
      subTitle={subTitle}
      error={error}
      onGoHome={handleGoHome}
      onSignIn={handleSignIn}
      onReload={handleReload}
      onNavigate={handleNavigate}
      showDiagnostics={true}
    />
  );
}
