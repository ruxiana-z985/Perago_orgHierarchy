// org-chart.policies.ts
// This file contains PURE business rules.
// It imports NOTHING from NestJS, TypeORM, or any infrastructure library.

import {
  ChangeActionType,
  PositionStatus,
  ReassignmentStrategy,
} from './org-chart.enums';

// PositionPolicy enforces rules about the position hierarchy
export class PositionPolicy {
  // Rule: You cannot delete the root position (the one with no parent)
  static assertRootNotDeleted(parentId: string | null): void {
    if (parentId === null) {
      throw new Error('ROOT_IMMUTABLE');
    }
  }

  // Rule: You cannot change a root position's parent
  static assertRootNotReparented(
    currentParentId: string | null,
    nextParentId: string | null,
  ): void {
    if (currentParentId === null && nextParentId !== null) {
      throw new Error('ROOT_IMMUTABLE');
    }
  }

  // Rule: You cannot make a position a child of itself or its descendants
  static assertNoCircularReference(
    positionId: string,
    newParentId: string | null,
    descendantIds: Set<string>,
  ): void {
    if (!newParentId) {
      return;
    }
    if (positionId === newParentId || descendantIds.has(newParentId)) {
      throw new Error('CIRCULAR_REFERENCE');
    }
  }

  // Rule: The hierarchy cannot exceed a maximum depth
  static assertDepthWithinLimit(
    nextDepth: number,
    maxDepth: number,
  ): void {
    if (nextDepth > maxDepth) {
      throw new Error('MAX_DEPTH_EXCEEDED');
    }
  }

  // Rule: When deleting a position that has children,
  // you must specify what happens to those children
  static assertDeleteStrategy(
    actionType: ChangeActionType,
    childrenCount: number,
    strategy?: ReassignmentStrategy,
  ): void {
    if (
      actionType === ChangeActionType.DELETE &&
      childrenCount > 0 &&
      !strategy
    ) {
      throw new Error('STRATEGY_REQUIRED');
    }
  }

  // Helper: Check if a position status is "active"
  static isActive(status: PositionStatus): boolean {
    return status === PositionStatus.ACTIVE;
  }
}