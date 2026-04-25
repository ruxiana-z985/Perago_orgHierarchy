# Perago Org Chart API

Approval-driven NestJS API for managing an organizational position hierarchy.

This project exposes public read endpoints for browsing an org chart and routes all structural changes through an email-based approval workflow. Instead of directly creating, updating, or deleting positions, users submit change requests, confirm them by email, and then an approver executes or rejects them.

## Highlights

- NestJS 8 + TypeORM + PostgreSQL
- Public read API for org chart browsing
- Approval workflow for `create`, `update`, and `delete`
- Email-based requester confirmation and approver decision flow
- Audit trail for executed changes
- Seeded starter hierarchy on first boot
- Swagger UI for easy manual testing
- Live deployment on Render

## Live Deployment

- API base URL: [https://perago-chart-api.onrender.com](https://perago-chart-api.onrender.com)
- Swagger UI: [https://perago-chart-api.onrender.com/api](https://perago-chart-api.onrender.com/api)
- Health check: [https://perago-chart-api.onrender.com/health](https://perago-chart-api.onrender.com/health)

## Problem This API Solves

The API manages a position tree such as:

- CEO
- CTO
- CFO
- COO
- HR

It supports:

- full tree retrieval
- single-position lookup
- direct-children lookup
- search
- controlled structural changes through approval requests

This approach keeps the hierarchy maintainable while making structural changes reviewable and traceable.

## Approval Workflow

All mutations follow this lifecycle:

1. A requester submits a change request.
2. The requester receives a confirmation email.
3. The requester confirms through the emailed link.
4. The configured approver receives an approval email.
5. The approver approves or rejects the request.
6. If approved, the position change is executed and an audit record is written.

Supported actions:

- `create`
- `update`
- `delete`

## Business Rules

- The CEO root is immutable once it exists.
- Positions are soft-deleted by setting status to `inactive`.
- Circular parent-child references are rejected.
- Depth is limited by configuration.
- Duplicate active sibling names are rejected.
- Delete requests with children require a reassignment strategy.
- Requester emails must end with `@perago.com` or match an allowlisted Gmail address in code.

Current allowlist note:

- The code currently allows `ruxiana985@gmail.com` for testing in addition to the configured `ORG_DOMAIN`.

## Architecture

The project follows a lightweight clean architecture structure:

- `src/domain`
  Business enums and policies
- `src/application`
  Command handlers, query handlers, and graph services
- `src/infrastructure`
  Entities, persistence, seed/bootstrap logic, and email delivery
- `src/interface`
  HTTP controllers and DTOs

## Core Entities

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

## API Endpoints

### Read endpoints

- `GET /health`
- `GET /positions`
- `GET /positions/:id`
- `GET /positions/:id/children`
- `GET /search?q=tech`

### Request workflow endpoints

- `POST /requests`
- `POST /requests/:id/confirm?token=...`
- `GET /requests/:id/confirm?token=...`
- `GET /requests/:id`
- `POST /requests/:id/approve?token=...`
- `GET /requests/:id/approve?token=...`
- `POST /requests/:id/reject`
- `GET /requests/:id/audit`

## Example Request Payloads

### Create request

```json
{
  "actionType": "create",
  "payload": {
    "name": "Senior Backend Developer",
    "description": "Builds core services",
    "parentId": "11111111-1111-4111-8111-111111111111"
  },
  "requesterEmail": "ruxiana985@gmail.com",
  "requesterName": "Ruxiana"
}
```

### Update request

```json
{
  "actionType": "update",
  "positionId": "11111111-1111-4111-8111-111111111111",
  "payload": {
    "name": "Engineering Manager",
    "description": "Leads backend and platform teams"
  },
  "requesterEmail": "ruxiana985@gmail.com",
  "requesterName": "Ruxiana"
}
```

### Delete request

```json
{
  "actionType": "delete",
  "positionId": "11111111-1111-4111-8111-111111111111",
  "payload": {
    "reassignmentStrategy": "promote-to-parent"
  },
  "requesterEmail": "ruxiana985@gmail.com",
  "requesterName": "Ruxiana"
}
```

## Local Development

### Requirements

- Node.js 20.x
- PostgreSQL
- npm

### Install

```bash
npm install
```

### Configure environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Important local values:

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `ORG_DOMAIN`
- `APPROVER_EMAIL`
- `API_BASE_URL`

### Run locally

```bash
npm run start:dev
```

Open:

- Swagger: [http://localhost:3000/api](http://localhost:3000/api)
- Health: [http://localhost:3000/health](http://localhost:3000/health)

## Environment Variables

### Database

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SYNCHRONIZE`

### App

- `NODE_ENV`
- `PORT`
- `API_BASE_URL`
- `FRONTEND_URL`

### Rate limiting

- `THROTTLE_TTL`
- `THROTTLE_LIMIT`

### Org workflow

- `ORG_DOMAIN`
- `APPROVER_EMAIL`
- `BACKUP_APPROVER_EMAIL`
- `MAX_DEPTH` optional, defaults to `10`
- `REQUEST_EXPIRY_DAYS` optional, defaults to `7`
- `CONFIRMATION_EXPIRY_HOURS` optional, defaults to `1`

### Email

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

Most deployments only need a small subset of these variables. The optional ones are useful when you want to override the default validation or request-expiry behavior.

## Email Behavior

If SMTP is configured, the API sends real emails:

- requester confirmation email
- approver decision email
- requester outcome email

If SMTP is not configured:

- the app logs email previews to the server logs
- in non-production environments, debug links may be returned in API responses

Important:

- `API_BASE_URL` must point to the real deployed API so email links do not use `localhost`

## Gmail SMTP Setup For Testing

If you want to test the email workflow with Gmail on Render, set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM=yourgmail@gmail.com
API_BASE_URL=https://perago-chart-api.onrender.com
```

Notes:

- Use a Google App Password, not your normal Gmail password
- Google App Passwords require 2-Step Verification on the Gmail account
- `APPROVER_EMAIL` can be a different inbox from `SMTP_USER`

## Render Deployment

The live application is deployed to Render as a native Node service.

### Deployment notes

- app runs with Node.js 20
- database connection comes from `DATABASE_URL`
- Render Postgres should use the internal connection string
- schema creation currently depends on `DB_SYNCHRONIZE=true` for first boot

### Important Render env vars

- `DATABASE_URL`
- `NODE_ENV=production`
- `DB_SYNCHRONIZE=true`
- `API_BASE_URL=https://perago-chart-api.onrender.com`
- `APPROVER_EMAIL=...`
- `SMTP_HOST=...`
- `SMTP_PORT=...`
- `SMTP_USER=...`
- `SMTP_PASSWORD=...`
- `SMTP_FROM=...`

### Production note

`DB_SYNCHRONIZE=true` is useful for initial deployment on a fresh database, but the better long-term approach is to add proper TypeORM migrations and then switch synchronization off.

## Testing The Live App

### Quick smoke test

1. Open [https://perago-chart-api.onrender.com/health](https://perago-chart-api.onrender.com/health)
2. Open [https://perago-chart-api.onrender.com/positions?format=tree](https://perago-chart-api.onrender.com/positions?format=tree)
3. Open [https://perago-chart-api.onrender.com/api](https://perago-chart-api.onrender.com/api)

### Full email workflow test

1. Call `GET /positions?format=tree`
2. Copy a valid parent position ID
3. Submit `POST /requests`
4. Open the confirmation email in the requester inbox
5. Click the confirmation link
6. Open the approval email in the approver inbox
7. Click the approval link
8. Check `GET /requests/:id`
9. Check `GET /requests/:id/audit`

## Scripts

```bash
npm run start:dev
npm run start:prod
npm run build
npm run test
npm run test:cov
npm run lint
```

## Verification

```bash
npm run build
npm run test
```

## Future Improvements

- add TypeORM migrations
- turn off production schema synchronization
- move Gmail allowlist into configuration instead of hardcoding it
- add authentication and role-based approval
- add stronger observability and error reporting
