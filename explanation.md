# Perago Internship Project Explanation

This file explains the final backend design for the internship project in the repo.

## 1. Why The Design Changed

The original task only required a hierarchical positions API with create, update, get, list tree, get children, and delete.

Your refined design adds stronger business control:

- positions only, no employee records
- no direct mutations
- all changes go through request, confirm, approve, or reject workflow
- requester must self-confirm
- only `@perago.com` emails can initiate requests
- HR or admin approves by email
- every executed change is audited
- root CEO position is immutable
- deletes are soft deletes

That refinement still satisfies the internship brief, but does it in a safer and more structured way.

## 2. Architecture Style Used

The implementation now follows Clean Architecture Lite with CQRS-lite and Tactical DDD ideas.

### Domain

Location:

- [src/domain](C:\Users\lenovo\Documents\perago-nestjs-api\src\domain)

Purpose:

- framework-agnostic business rules
- enums for statuses and action types
- policies for email domain validation, request lifecycle rules, root immutability, circular reference checks, depth checks, and delete strategy enforcement

Main files:

- [src/domain/org-chart.enums.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\domain\org-chart.enums.ts)
- [src/domain/org-chart.policies.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\domain\org-chart.policies.ts)

### Application

Location:

- [src/application](C:\Users\lenovo\Documents\perago-nestjs-api\src\application)

Purpose:

- command handlers for write workflows
- query handlers for read workflows
- shared graph logic for hierarchy traversal and materialized path rebuilding

Write handlers:

- [submit-change-request.command-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\commands\submit-change-request.command-handler.ts)
- [confirm-change-request.command-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\commands\confirm-change-request.command-handler.ts)
- [approve-change-request.command-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\commands\approve-change-request.command-handler.ts)
- [reject-change-request.command-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\commands\reject-change-request.command-handler.ts)

Read handlers:

- [get-positions.query-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\queries\get-positions.query-handler.ts)
- [get-position-details.query-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\queries\get-position-details.query-handler.ts)
- [get-position-children.query-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\queries\get-position-children.query-handler.ts)
- [search-positions.query-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\queries\search-positions.query-handler.ts)
- [get-change-request.query-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\queries\get-change-request.query-handler.ts)
- [get-change-request-audit.query-handler.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\queries\get-change-request-audit.query-handler.ts)

Shared graph service:

- [org-chart-graph.service.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\application\services\org-chart-graph.service.ts)

### Infrastructure

Location:

- [src/infrastructure](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure)

Purpose:

- TypeORM persistence models
- SMTP email sending
- startup seeding
- scheduled expiry cleanup

Main files:

- [position.entity.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure\persistence\entities\position.entity.ts)
- [position-change-request.entity.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure\persistence\entities\position-change-request.entity.ts)
- [audit-log.entity.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure\persistence\entities\audit-log.entity.ts)
- [approval-email.service.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure\mail\approval-email.service.ts)
- [org-chart-seed.service.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure\persistence\org-chart-seed.service.ts)
- [change-request-expiry.service.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure\persistence\change-request-expiry.service.ts)

### Interface

Location:

- [src/interface](C:\Users\lenovo\Documents\perago-nestjs-api\src\interface)

Purpose:

- HTTP controllers
- Swagger docs
- DTOs for query params and request bodies

Main files:

- [health.controller.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\interface\http\controllers\health.controller.ts)
- [positions.controller.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\interface\http\controllers\positions.controller.ts)
- [requests.controller.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\interface\http\controllers\requests.controller.ts)

## 3. Data Model

### PositionEntity

Purpose:

- stores the organization hierarchy

Fields:

- `id`
- `name`
- `description`
- `parentId`
- `path`
- `depth`
- `status`
- `createdAt`
- `updatedAt`

Important rules:

- root has `parentId = null`
- unique sibling names are enforced with a partial unique index
- `path` stores the materialized hierarchy like `CEO > CTO > Tech Lead`
- `depth` caches the level for efficient reads
- deleted positions are not removed, only marked `inactive`

### PositionChangeRequestEntity

Purpose:

- orchestrates all create, update, and delete workflows

It tracks:

- action type
- target position
- payload
- requester identity
- confirmation token
- approval token
- status
- rejection reason
- execution timestamps

### AuditLogEntity

Purpose:

- immutable record of every executed mutation

It stores:

- requester
- approver
- action type
- before state
- after state
- execution time

## 4. API Surface

### Public Read API

- `GET /health`
- `GET /positions`
- `GET /positions/{id}`
- `GET /positions/{id}/children`
- `GET /search?q=...`

These are immediate reads and do not need login or session state.

### Approval Workflow API

- `POST /requests`
- `POST /requests/{id}/confirm?token=...`
- `GET /requests/{id}`
- `POST /requests/{id}/approve?token=...`
- `POST /requests/{id}/reject`
- `GET /requests/{id}/audit`

These are the only write path into the system.

## 5. Write Workflow

### Submit

`POST /requests`

The requester submits a desired change:

- create
- update
- delete

The server validates:

- valid action type
- requester email format
- requester email domain
- target position existence
- parent existence
- duplicate names under same parent
- depth limit
- circular references
- root immutability
- delete strategy requirement

If valid:

- a request row is created
- confirmation token is generated
- approval token is generated
- confirmation email is sent

### Confirm

`POST /requests/{id}/confirm?token=...`

The requester must confirm the request using the email link. This prevents somebody from typing another person's email into the form and forcing HR approval traffic onto them.

If valid:

- status changes to `pending-approval`
- HR or admin gets the approval email

### Approve

`POST /requests/{id}/approve?token=...`

The approver validates the request and the system executes it in a single database transaction.

Execution behavior:

- create inserts a new active position
- update modifies the target position and rebuilds hierarchy metadata
- delete performs soft delete and optionally promotes children to the deleted role's parent

After execution:

- audit log is inserted
- request status becomes `executed`
- requester receives outcome email

### Reject

`POST /requests/{id}/reject`

The approver supplies:

- token
- rejection reason
- optional approver name

The request becomes `rejected` and the requester is notified.

## 6. Hierarchy Algorithm Choices

### Materialized Path

The system stores `path` and `depth` on each active position.

Why:

- fast ancestor display
- fast subtree rendering
- simple cycle reasoning
- no recursive SQL required for common read paths

### Tree Rendering

`GET /positions?format=tree` works by:

1. loading active positions
2. building an `id -> node` map
3. attaching children to parents
4. sorting each level
5. returning roots or subtree roots

### Circular Reference Protection

Updates compute descendants of the target node and reject any move where the new parent is the node itself or inside that descendant set.

### Path Rebuild

After any executed mutation, the graph service recalculates `path` and `depth` across active positions so reads stay consistent.

## 7. Email Model

The backend supports two modes.

### SMTP Mode

If these env vars are configured:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`

then real emails are sent.

### Local Preview Mode

If SMTP is not configured:

- email bodies are logged in the terminal
- local debug links are returned in request responses

This makes Swagger testing practical during development.

## 8. Automatic Expiry

The spec required approvals to expire automatically.

That is handled by:

- [change-request-expiry.service.ts](C:\Users\lenovo\Documents\perago-nestjs-api\src\infrastructure\persistence\change-request-expiry.service.ts)

It runs hourly and marks stale pending requests as `expired`, clearing their tokens.

## 9. Startup Behavior

On startup:

1. `.env` is loaded
2. PostgreSQL connection is created
3. entities are synchronized
4. seed service checks whether active positions exist
5. if no active positions exist, a default hierarchy is inserted
6. if rows already exist, paths and depths are rebuilt
7. Swagger is exposed at `/api`

## 10. How To Demo It In Swagger

Recommended demo order:

1. `GET /positions?format=tree`
2. `GET /positions/{id}`
3. `GET /positions/{id}/children`
4. `POST /requests`
5. use `links.confirmationUrl`
6. use `links.approveUrl` or `POST /requests/{id}/reject`
7. `GET /requests/{id}`
8. `GET /requests/{id}/audit`

## 11. What Makes This Strong For The Internship

This solution goes beyond plain CRUD in a useful way:

- it still fulfills the original hierarchy API requirement
- it shows strong backend modeling instincts
- it demonstrates business-rule enforcement instead of only endpoint wiring
- it uses maintainable separation of concerns
- it includes controller tests
- it keeps the system simple enough for a recruiting assignment

That balance is important. It is more thoughtful than a scaffold-level submission, but still small enough to explain clearly in an interview.
