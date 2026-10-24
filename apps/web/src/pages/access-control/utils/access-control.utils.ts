import {
  AccessAssignmentStatus,
  AccessSubjectType,
  DoorSecurityLevel,
  DoorStatus,
  NonADUserStatus,
} from '@uims/shared-types';

export function downloadBlobFile(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    const createObjectURL = window.URL?.createObjectURL || URL?.createObjectURL;
    if (typeof createObjectURL === 'function') {
      const url = createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        if (typeof window.URL?.revokeObjectURL === 'function') {
          window.URL.revokeObjectURL(url);
        }
      }, 500);
    }
  } catch (downloadErr: unknown) {
    throw downloadErr;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error: unknown) {
    void error;
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error: unknown) {
    void error;
    return dateStr;
  }
}

export function getSecurityLevelColor(level?: DoorSecurityLevel | string): string {
  switch (level) {
    case DoorSecurityLevel.STANDARD:
    case 'STANDARD':
      return 'blue';
    case DoorSecurityLevel.RESTRICTED:
    case 'RESTRICTED':
      return 'orange';
    case DoorSecurityLevel.HIGH:
    case 'HIGH':
      return 'volcano';
    case DoorSecurityLevel.CRITICAL:
    case 'CRITICAL':
      return 'red';
    default:
      return 'default';
  }
}

export function getDoorStatusColor(status?: DoorStatus | string): string {
  switch (status) {
    case DoorStatus.ACTIVE:
    case 'ACTIVE':
      return 'success';
    case DoorStatus.MAINTENANCE:
    case 'MAINTENANCE':
      return 'warning';
    case DoorStatus.INACTIVE:
    case 'INACTIVE':
      return 'default';
    default:
      return 'default';
  }
}

export function getNonAdStatusColor(status?: NonADUserStatus | string): string {
  switch (status) {
    case NonADUserStatus.ACTIVE:
    case 'ACTIVE':
      return 'success';
    case NonADUserStatus.INACTIVE:
    case 'INACTIVE':
      return 'default';
    case NonADUserStatus.BLACKLISTED:
    case 'BLACKLISTED':
      return 'error';
    default:
      return 'default';
  }
}

export function getAssignmentStatusColor(status?: AccessAssignmentStatus | string): string {
  switch (status) {
    case AccessAssignmentStatus.ACTIVE:
    case 'ACTIVE':
      return 'success';
    case AccessAssignmentStatus.REVOKED:
    case 'REVOKED':
      return 'error';
    case AccessAssignmentStatus.EXPIRED:
    case 'EXPIRED':
      return 'default';
    default:
      return 'default';
  }
}

export function getSubjectTypeTag(type: AccessSubjectType): { color: string; label: string } {
  if (type === AccessSubjectType.DIRECTORY_USER) {
    return { color: 'blue', label: 'AD Employee' };
  }
  return { color: 'purple', label: 'External / Non-AD' };
}
