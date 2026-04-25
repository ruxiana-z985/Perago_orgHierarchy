import {
  ChangeActionType,
  ChangeRequestStatus,
  PositionStatus,
  ReassignmentStrategy,
} from './org-chart.enums';

export class EmailPolicy {
  static normalizeRequesterEmail(email: string, allowedDomain: string): string {
    const normalized = (email ?? '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('INVALID_EMAIL');
    }

    // Allow specific Gmail addresses and the allowed domain
    const allowedGmailAddresses = ['ruxiana985@gmail.com'];
    const isAllowedGmail = allowedGmailAddresses.includes(normalized);
    const isAllowedDomain = normalized.endsWith(`@${allowedDomain.toLowerCase()}`);

    if (!isAllowedGmail && !isAllowedDomain) {
      throw new Error('INVALID_DOMAIN');
    }

    return normalized;
  }
}

export class RequestLifecyclePolicy {
  static ensureConfirmable(
    status: ChangeRequestStatus,
    createdAt: Date,
    confirmationExpiryHours: number,
    tokenMatches: boolean,
  ): void {
    if (status !== ChangeRequestStatus.PENDING_CONFIRMATION) {
      throw new Error('REQUEST_NOT_CONFIRMABLE');
    }

    if (new Date(createdAt.getTime() + confirmationExpiryHours * 60 * 60 * 1000) < new Date()) {
      throw new Error('CONFIRMATION_EXPIRED');
    }

    if (!tokenMatches) {
      throw new Error('INVALID_CONFIRMATION_TOKEN');
    }
  }

  static ensureApprovable(
    status: ChangeRequestStatus,
    expiresAt: Date,
    tokenMatches: boolean,
  ): void {
    if (status !== ChangeRequestStatus.PENDING_APPROVAL) {
      throw new Error('REQUEST_NOT_APPROVABLE');
    }

    if (expiresAt < new Date()) {
      throw new Error('REQUEST_EXPIRED');
    }

    if (!tokenMatches) {
      throw new Error('INVALID_APPROVAL_TOKEN');
    }
  }
}

export class PositionPolicy {
  static assertRootNotDeleted(parentId: string | null): void {
    if (parentId === null) {
      throw new Error('ROOT_IMMUTABLE');
    }
  }

  static assertRootNotReparented(
    currentParentId: string | null,
    nextParentId: string | null,
  ): void {
    if (currentParentId === null && nextParentId !== null) {
      throw new Error('ROOT_IMMUTABLE');
    }
  }

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

  static assertDepthWithinLimit(
    nextDepth: number,
    maxDepth: number,
  ): void {
    if (nextDepth > maxDepth) {
      throw new Error('MAX_DEPTH_EXCEEDED');
    }
  }

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

  static isActive(status: PositionStatus): boolean {
    return status === PositionStatus.ACTIVE;
  }
}
