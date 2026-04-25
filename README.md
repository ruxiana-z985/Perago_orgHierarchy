# perago-nestjs-api

Approval-driven NestJS API for managing Perago's organizational position hierarchy.

## Architecture

The codebase now follows a Clean Architecture Lite structure:

- `src/domain`
  Pure business enums and policies
- `src/application`
  Command handlers for writes, query handlers for reads, and shared graph services
- `src/infrastructure`
  TypeORM entities, seed/bootstrap logic, expiry job, and SMTP email delivery
- `src/interface`
  NestJS controllers and HTTP DTOs

This keeps the internship solution maintainable without overengineering it into microservices, separate read databases, or full event sourcing.

## What Changed

This project no longer allows direct create, update, or delete operations on positions.

All mutations now go through an approval workflow:

1. A requester submits a change request.
2. The requester confirms it by email.
3. HR or admin approves or rejects it by email.
4. The system executes the change and writes an audit log.

The API still satisfies the original internship goals around hierarchical positions, tree retrieval, single-position lookup, children lookup, maintainability, and controller tests, but it now does so through a stricter workflow model.

## Core Principles

- Positions only. No employee records, user accounts, sessions, or login flow.
- Public read API. Anyone can browse the org chart and request status.
- Async mutations only. All create, update, and delete operations go through email-based approval.
- CEO root is immutable. It cannot be deleted, and the system does not allow root replacement once the tree exists.
- Audit-first design. Every executed change records requester, approver, and before/after values.
- Domain-gated requests. Only emails ending in `@perago.com` can submit requests.
- Soft delete only. Deleted positions are marked `inactive` instead of being removed from the database.
- Requests expire automatically through a scheduled cleanup job.

## Main Endpoints

### Public read endpoints

- `GET /health`
- `GET /positions`
- `GET /positions/:id`
- `GET /positions/:id/children`
- `GET /search?q=tech`

### Approval workflow endpoints

- `POST /requests`
- `POST /requests/:id/confirm?token=...`
- `GET /requests/:id`
- `POST /requests/:id/approve?token=...`
- `POST /requests/:id/reject`
- `GET /requests/:id/audit`

## Data Model

### `positions`

- `id`
- `name`
- `description`
- `parentId`
- `path`
- `depth`
- `status`
- `createdAt`
- `updatedAt`

### `position_change_requests`

- `id`
- `actionType`
- `positionId`
- `payload`
- `requesterEmail`
- `requesterName`
- `requesterConfirmed`
- `confirmationToken`
- `approverEmail`
- `approvalToken`
- `approvalStatus`
- `approvedByName`
- `approvedAt`
- `executedAt`
- `rejectionReason`
- `createdAt`
- `expiresAt`

### `audit_logs`

- `id`
- `changeRequestId`
- `positionId`
- `actionType`
- `actorEmail`
- `actorName`
- `approverEmail`
- `approverName`
- `oldValues`
- `newValues`
- `executedAt`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a PostgreSQL database named `orga_structure`.

3. Copy `.env.example` to `.env` and update it:

```bash
cp .env.example .env
```

4. Start the API:

```bash
npm run start:dev
```

5. Open Swagger:

[http://localhost:3000/api](http://localhost:3000/api)

## Email Behavior

If `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are configured, the API sends real emails for confirmation and approval.

If SMTP is not configured, the app falls back to console email previews and also returns development debug links in request responses so the workflow is still testable locally.

## Local Testing Flow

1. `GET /positions?format=tree`
2. `POST /requests`
3. Confirm the request using the returned debug link or the email link
4. Approve or reject it using the returned debug link or the email link
5. Check `GET /requests/:id`
6. Check `GET /requests/:id/audit`

## Verification

```bash
npx jest --runInBand
npm run build
```
