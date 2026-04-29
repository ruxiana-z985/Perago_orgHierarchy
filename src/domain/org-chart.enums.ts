// org-chart.enums.ts
// This file defines all the constants and categories used across the application.
// Each "enum" is a set of named values that represent the only valid options
// for a particular concept.

export enum PositionStatus {
  // A position that currently exists and is usable
  ACTIVE = 'active',
  // A position that has been deleted/removed
  INACTIVE = 'inactive',
}

export enum ChangeActionType {
  // Creating a brand new position
  CREATE = 'create',
  // Modifying an existing position
  UPDATE = 'update',
  // Removing an existing position
  DELETE = 'delete',
}

export enum AuditActionType {
  // A position was created
  CREATED = 'created',
  // A position was modified
  UPDATED = 'updated',
  // A position was removed
  DELETED = 'deleted',
}

export enum ReassignmentStrategy {
  // When deleting a position that has children,
  // move those children up to report to the deleted position's parent
  PROMOTE_TO_PARENT = 'promote-to-parent',
}