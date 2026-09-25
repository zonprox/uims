import axios from 'axios';

/**
 * Standardized permission-aware error message resolution.
 * Transforms raw HTTP 403, network rejections, or backend error payloads
 * into clear, consistent, professional enterprise English messages.
 *
 * @param error - The caught unknown error object
 * @param fallbackAction - Contextual action verb phrase, e.g. "delete this asset", "update user account"
 */
export function formatErrorMessage(
  error: unknown,
  fallbackAction = 'perform this action',
  defaultFallback?: string,
): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    let serverData = error.response?.data as
      | { message?: string | string[]; error?: string }
      | string
      | undefined;

    if (typeof serverData === 'string' && serverData.trim().startsWith('{')) {
      try {
        serverData = JSON.parse(serverData) as { message?: string | string[]; error?: string };
      } catch {
        // Retain raw string if JSON parsing fails
      }
    }

    const serverMessage =
      typeof serverData === 'object' && serverData !== null
        ? serverData.message
        : typeof serverData === 'string' && serverData.trim()
          ? serverData.trim()
          : undefined;

    // HTTP 403 Forbidden / Permission Denied
    if (status === 403) {
      if (
        serverMessage &&
        typeof serverMessage === 'string' &&
        serverMessage !== 'Forbidden resource' &&
        serverMessage !== 'Forbidden' &&
        serverMessage !== 'Access denied: Insufficient permissions.' &&
        serverMessage !==
          'Access Denied: You lack the required permissions to perform this action. Please contact your administrator.' &&
        serverMessage.trim().length > 0
      ) {
        return serverMessage.toLowerCase().startsWith('access denied')
          ? serverMessage
          : `Access denied: ${serverMessage}`;
      }
      if (fallbackAction && fallbackAction !== 'perform this action') {
        return `Access denied: Insufficient permissions to ${fallbackAction}.`;
      }
      return 'Access denied: Insufficient permissions.';
    }

    // HTTP 401 Unauthorized
    if (status === 401) {
      return 'Session expired or unauthenticated. Please sign in again.';
    }

    // Detailed server validation or business logic messages
    if (serverMessage) {
      if (Array.isArray(serverMessage)) {
        return serverMessage.join(', ');
      }
      return String(serverMessage);
    }
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes('403') ||
      msg.toLowerCase().includes('forbidden') ||
      msg.toLowerCase().includes('permission') ||
      msg.toLowerCase().includes('access denied')
    ) {
      if (fallbackAction && fallbackAction !== 'perform this action') {
        return `Access denied: Insufficient permissions to ${fallbackAction}.`;
      }
      return 'Access denied: Insufficient permissions.';
    }
    if (defaultFallback) {
      return defaultFallback;
    }
    return msg;
  }

  return (
    defaultFallback ||
    (fallbackAction && fallbackAction !== 'perform this action'
      ? `Failed to ${fallbackAction}. Please try again.`
      : 'Operation failed. Please try again.')
  );
}

/**
 * Standard permission-denied message for frontend pre-check permission toasts.
 * Use when an operator triggers a button or action they lack RBAC privileges for.
 */
export function getPermissionDeniedMessage(action = 'perform this action'): string {
  if (action && action !== 'perform this action') {
    return `Access denied: Insufficient permissions to ${action}.`;
  }
  return 'Access denied: Insufficient permissions.';
}
