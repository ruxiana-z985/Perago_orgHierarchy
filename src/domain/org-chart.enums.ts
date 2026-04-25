export enum PositionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ChangeActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum ChangeRequestStatus {
  PENDING_CONFIRMATION = 'pending-confirmation',
  PENDING_APPROVAL = 'pending-approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  EXECUTED = 'executed',
}

export enum AuditActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
}

export enum ReassignmentStrategy {
  PROMOTE_TO_PARENT = 'promote-to-parent',
}
