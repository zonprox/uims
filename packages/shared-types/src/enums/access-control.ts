export enum DoorSecurityLevel {
  STANDARD = 'STANDARD',
  RESTRICTED = 'RESTRICTED',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum DoorStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum NonADUserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
}

export enum AccessSubjectType {
  DIRECTORY_USER = 'DIRECTORY_USER',
  NON_AD_USER = 'NON_AD_USER',
}

export enum AccessValidityType {
  PERMANENT = 'PERMANENT',
  TIME_BOUND = 'TIME_BOUND',
}

export enum AccessAssignmentStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum DoorDocumentType {
  GRANT = 'GRANT',
  REVOCATION = 'REVOCATION',
}
