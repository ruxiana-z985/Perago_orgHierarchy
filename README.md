# Perago Org Chart API

> Approval-driven REST API for managing an organizational position hierarchy

[![NestJS](https://img.shields.io/badge/NestJS-8.x-red)](https://nestjs.com)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.x-blue)](https://typeorm.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-UNLICENSED-orange)](LICENSE)

## Overview

The Perago Org Chart API is a NestJS-based REST API that manages an organizational position hierarchy. All structural changes to the organization chart go through a rigorous email-based approval workflow, ensuring that organizational changes are reviewable, traceable, and auditable.

### Key Features

- 📊 **Public Read API** - Browse the org chart without authentication
- ✅ **Approval Workflow** - All mutations require email confirmation and approver decision
- 📝 **Audit Trail** - Complete history of all executed changes
- 🔒 **Security** - Helmet, CORS, rate limiting, and token-based authentication
- 📚 **Swagger UI** - Interactive API documentation
- 🚀 **Live Deployment** - Running on Render

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Approval Workflow](#approval-workflow)
- [Security](#security)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Development](#development)

---

## Quick Start

### Prerequisites

- Node.js 20.x
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd perago-nestjs-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start the development server
npm run start:dev
```

### Access the API

| Service | URL |
|---------|-----|
| API Base | http://localhost:3000 |
| Swagger UI | http://localhost:3000/api |
| Health Check | http://localhost:3000/health |

---

## Architecture

The project follows a **clean architecture** pattern with clear separation of concerns:

```
src/
├── domain/              # Business enums and policies
│   ├── org-chart.enums.ts
│   └── org-chart.policies.ts
├── application/         # Command & Query handlers
│   ├── commands/        # Write operations
│   ├── queries/         # Read operations
│   └── services/        # Business logic
├── infrastructure/      # External concerns
│   ├── mail/            # Email delivery
│   └── persistence/     # Database & entities
└── interface/           # HTTP layer
    ├── controllers/     # Route handlers
    └── dto/             # Data transfer objects
```

### Layer Responsibilities

| Layer | Purpose |
|-------|---------|
| `domain` | Business rules, enums, and validation policies |
| `application` | CQRS handlers - commands (writes) and queries (reads) |
| `infrastructure` | Database persistence, email services, seeding |
| `interface` | HTTP controllers and DTOs for external communication |

---

## API Endpoints

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health and version |

### Positions (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/positions` | Get all positions in the hierarchy |
| GET | `/positions/:id` | Get a specific position by ID |
| GET | `/positions/:id/children` | Get direct children of a position |
| GET | `/search?q=<query>` | Search positions by name |

### Change Requests (Workflow)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/requests` | Submit a new change request |
| POST | `/requests/:id/confirm` | Confirm a request via email token |
| GET | `/requests/:id/confirm` | Confirm via email link (browser) |
| GET | `/requests/:id` | Get request status and impact details |
| POST | `/requests/:id/approve` | Approve a request via token |
| GET | `/requests/:id/approve` | Approve via email link (browser) |
| POST | `/requests/:id/reject` | Reject a request |
| GET | `/requests/:id/audit` | Get audit trail for a request |

---

## Approval Workflow

All mutations follow a strict lifecycle to ensure organizational changes are properly reviewed:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Submit    │───▶│  Confirm    │───▶│   Approve   │───▶│  Execute    │
│   Request   │    │   (Email)   │    │   (Email)   │    │   Change    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                   │                  │                   │
     ▼                   ▼                  ▼                   ▼
  PENDING        PENDING_APPROVAL     APPROVED/REJECTED    COMPLETED
CONFIRMATION
```

### Workflow Steps

1. **Submit** - Requester creates a change request (create/update/delete)
2. **Confirm** - Requester receives confirmation email and clicks the link
3. **Approve** - Approver receives approval email and approves/rejects
4. **Execute** - If approved, the position change is applied and audited

### Supported Actions

| Action | Description |
|--------|-------------|
| `create` | Create a new position in the hierarchy |
| `update` | Modify an existing position's name/description/parent |
| `delete` | Soft-delete a position (set to inactive) |

### Example Payloads

#### Create Request

```json
{
  "actionType": "create",
  "payload": {
    "name": "Senior Backend Developer",
    "description": "Builds core services",
    "parentId": "11111111-1111-4111-8111-111111111111"
  },
  "requesterEmail": "user@perago.com",
  "requesterName": "John Doe"
}
```

#### Update Request

```json
{
  "actionType": "update",
  "positionId": "11111111-1111-4111-8111-111111111111",
  "payload": {
    "name": "Engineering Manager",
    "description": "Leads backend and platform teams"
  },
  "requesterEmail": "user@perago.com",
  "requesterName": "John Doe"
}
```

#### Delete Request

```json
{
  "actionType": "delete",
  "positionId": "11111111-1111-4111-8111-111111111111",
  "payload": {
    "reassignmentStrategy": "promote-to-parent"
  },
  "requesterEmail": "user@perago.com",
  "requesterName": "John Doe"
}
```

---

## Security

### Implemented Security Measures

| Feature | Implementation |
|---------|-----------------|
| **Helmet** | Security headers (CSP, X-Frame-Options, HSTS, etc.) |
| **CORS** | Configurable per environment; restricted in production |
| **Rate Limiting** | `@nestjs/throttler` with configurable TTL/limit |
| **Token-based Auth** | Unique confirmation/approval tokens per request |
| **Email Domain Restriction** | Only `@perago.com` or allowlisted emails |
| **Business Policies** | Root immutability, circular reference prevention |

### Security Considerations

- **Read endpoints** are public (no authentication required)
- **Mutation endpoints** require email confirmation and approval tokens
- Requester emails must be from the configured domain (`ORG_DOMAIN`)
- All changes are logged in the audit trail

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | Allowed frontend origin | - |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `perago` |
| `DB_SYNCHRONIZE` | Enable TypeORM sync | `true` |
| `ORG_DOMAIN` | Allowed email domain | `perago.com` |
| `APPROVER_EMAIL` | Email address for approvals | - |
| `SMTP_HOST` | SMTP server host | - |
| `SMTP_PORT` | SMTP server port | - |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `THROTTLE_TTL` | Rate limit time window (seconds) | `60` |
| `THROTTLE_LIMIT` | Requests per time window | `100` |

---

## Database Schema

### Entities

#### `positions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Position name |
| `description` | TEXT | Position description |
| `parentId` | UUID | Parent position ID (nullable for root) |
| `path` | VARCHAR(1000) | Materialized path for hierarchy queries |
| `depth` | INTEGER | Depth level in the tree |
| `status` | ENUM | `active` or `inactive` |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### `position_change_requests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `actionType` | ENUM | `create`, `update`, or `delete` |
| `positionId` | UUID | Target position (for update/delete) |
| `payload` | JSONB | Change details |
| `requesterEmail` | VARCHAR(255) | Email of requester |
| `requesterName` | VARCHAR(255) | Name of requester |
| `requesterConfirmed` | BOOLEAN | Whether requester confirmed |
| `confirmationToken` | VARCHAR(255) | Token for confirmation |
| `approverEmail` | VARCHAR(255) | Email of approver |
| `approvalToken` | VARCHAR(255) | Token for approval |
| `approvalStatus` | ENUM | `pending`, `approved`, `rejected` |
| `approvedByName` | VARCHAR(255) | Name of approver |
| `approvedAt` | TIMESTAMP | Approval timestamp |
| `executedAt` | TIMESTAMP | Execution timestamp |
| `rejectionReason` | TEXT | Reason for rejection |
| `expiresAt` | TIMESTAMP | Request expiration |

#### `audit_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `changeRequestId` | UUID | Reference to change request |
| `positionId` | UUID | Affected position |
| `actionType` | ENUM | Type of change |
| `actorEmail` | VARCHAR(255) | Email of actor |
| `actorName` | VARCHAR(255) | Name of actor |
| `oldValues` | JSONB | Previous state |
| `newValues` | JSONB | New state |
| `executedAt` | TIMESTAMP | Execution timestamp |

---

## Business Rules

- **Root Immutability** - The CEO root position cannot be deleted or re-parented
- **Soft Delete** - Positions are marked as `inactive` rather than hard deleted
- **Circular Reference Prevention** - Parent-child cycles are rejected
- **Depth Limits** - Maximum hierarchy depth is configurable
- **Unique Siblings** - Duplicate active position names under the same parent are rejected
- **Delete with Children** - Deleting positions with children requires a reassignment strategy

---

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start development server with hot reload |
| `npm run start:debug` | Start with debugging enabled |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run lint` | Lint and fix code |

### Project Structure

```
perago-nestjs-api/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── org-chart.module.ts    # Feature module
│   ├── application/           # CQRS handlers
│   ├── domain/                # Business logic
│   ├── infrastructure/        # Persistence & services
│   └── interface/             # HTTP layer
├── test/
│   ├── app.e2e-spec.ts        # E2E tests
│   └── jest-e2e.json          # Jest configuration
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## Live Deployment

| Service | URL |
|---------|-----|
| API Base | https://perago-chart-api.onrender.com |
| Swagger UI | https://perago-chart-api.onrender.com/api |
| Health Check | https://perago-chart-api.onrender.com/health |

---

## License

UNLICENSED © 2024 Perago Information Systems
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
