## Multi‑Tenant Architecture and Implementation Plan

This document specifies the design and implementation plan to convert the current application into a secure, scalable, and clear multi‑tenant agent using Subscription ID as the tenant key. It aligns strictly with the decisions and constraints you provided.

## Scope
- Add tenant isolation across authentication, Sentinel operations, incidents, analytics, emails, and logging
- Drive tenant resolution from Subscription ID present in incident payloads
- Keep storage in memory for now; plan for a later MongoDB migration
- Keep API unauthenticated for now (no RBAC)
- Frontend filters incidents and analytics client‑side by tenant; backend returns all
- No hot‑reload of tenant configs; restart required for changes

## Non‑Goals (Phase 1)
- Database persistence (will come later with MongoDB)
- Backend query parameters for filtering incidents by tenant (UI only in phase 1)
- Multi‑workspace per subscription (explicitly 1:1 mapping per your confirmation)
- AuthN/AuthZ for users (dashboard remains open in this phase)
- Secrets manager integration (TENANTS_JSON override supported; still requires restart)

## Decisions and Constraints (Authoritative)
- Tenants source: backend/config/tenants.json at startup; optional TENANTS_JSON override; no hot‑reload
- Mapping: one subscriptionId → one resourceGroup and one workspaceName
- Incident payloads include ARM‑style IDs containing /subscriptions/<subId>/
- Owner vs Client separation:
  - ownerEmail is for Sentinel assignment only (incident owner)
  - customerMail.toSenderMail is a multi‑recipient list for customer notifications (ack + final RCA)
- Email sending:
  - Sender: SENDGRID_FROM_EMAIL is a global, constant value used for all notifications (does not vary by tenant)
  - Provider: SENDGRID_API_KEY is global for all tenants
  - Recipients: per‑tenant customerMail.toSenderMail (multi‑recipient)
- SSE: backend broadcasts all events; frontend filters by selected tenant
- /incidents returns all incidents; frontend filters locally

## Tenant Model (no code, canonical fields)
Each tenant entry includes:
- Identity: key (stable id), displayName (UI label)
- Azure AD (Auth): tenantId, clientId, clientSecret
- Sentinel Scope: subscriptionId, resourceGroup, workspaceName
- Incident Owner (Sentinel assignment): ownerName, ownerEmail, ownerObjectId (opt), ownerUpn (opt)
- Customer Mail (Notifications):

  - customerMail.toSenderMail (array of recipient emails; multi‑recipient supported)

Validation rules at load time:
- All required fields present
- key unique across tenants
- subscriptionId unique across tenants
- Emails syntactically valid for ownerEmail and all customerMail.toSenderMail entries

## Environment Variables (global)
- AZURE_LOGIN_URL = https://login.microsoftonline.com
- AZURE_MANAGEMENT_API_URL = https://management.azure.com
- SENTINEL_API_VERSION = <provided>
- SENDGRID_API_KEY = <provided>
- SENDGRID_FROM_EMAIL = <provided> (global, constant sender; does not vary by tenant)
- Existing AI provider variables remain unchanged

## Backend Changes (file‑by‑file)

### backend/config/tenants.json (new data file)
- Contains the array of tenant entries using the Tenant Model above
- Loaded at process start (or TENANTS_JSON override)
- No hot‑reload in phase 1; changes require restart

### backend/services/tenantService.js (new)
- Responsibilities:
  - Load tenants from tenants.json or TENANTS_JSON
  - Validate using the rules above
  - Expose:
    - getTenantBySubscriptionId(subscriptionId)
    - getTenantByKey(key)
    - listTenants() for UI dropdown
  - Keep minimal internal state: inMemoryTenantsByKey, inMemoryTenantsBySubscription
  - Provide structured errors on validation failure (logged)

### backend/services/azureAuthService.js (edit)
- Replace global token cache with per‑tenant token caches keyed by tenant.key (or tenantId)
- getAzureToken(tenantCtx):
  - Use tenantCtx.tenantId, tenantCtx.clientId, tenantCtx.clientSecret
  - Scope: AZURE_MANAGEMENT_API_URL/.default
  - Cache per tenant with early refresh; on 401 clear only that tenant’s cache and retry once
- Keep AZURE_LOGIN_URL, AZURE_MANAGEMENT_API_URL global

### backend/services/sentinelService.js (edit)
- Make functions tenant‑aware (all public functions accept tenantCtx)
- Build API URLs from tenantCtx.subscriptionId, tenantCtx.resourceGroup, tenantCtx.workspaceName, and global SENTINEL_API_VERSION
- Acquire token with getAzureToken(tenantCtx)
- Use owner fields from tenantCtx (ownerName, ownerEmail, ownerObjectId, ownerUpn) for assignments
- Remove all dependencies on AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, AZURE_WORKSPACE_NAME, SENTINEL_OWNER_* envs

### backend/services/mailService.js (verify and adapt without breaking)
- Sender address: always use the global, constant SENDGRID_FROM_EMAIL (does not vary by tenant)
- Recipient list:
  - Send to all tenantCtx.customerMail.toSenderMail addresses (array)
- Provider credentials:
  - Use global SENDGRID_API_KEY

### backend/services/eventStream.js (edit)
- Ensure all events include tenantKey and subscriptionId in the payload
- No server‑side filtering; broadcast remains global

### backend/server.js (edit)
- /analyse
  - Parse incidentData.id or incidentData.name for ARM path and extract subscriptionId (pattern contains /subscriptions/<subId>/)
  - Resolve tenantCtx via tenantService.getTenantBySubscriptionId
  - If unknown tenant: return 400 with structured error including requestId, subscriptionId
  - Tag emitStage events and logs with tenantKey and subscriptionId
  - Store incident with tenant metadata:
    - tenantKey, tenantDisplayName, subscriptionId, resourceGroup, workspaceName
    - ownerName (for display on dashboard)
    - customerMail (for tracing only; avoid storing full arrays if not needed)
  - Sentinel operations: call sentinelService with tenantCtx
  - Notifications: mailService sends from global SENDGRID_FROM_EMAIL to all tenantCtx.customerMail.toSenderMail recipients (multi‑recipient)
- /incidents
  - Return all incidents (unfiltered) including tenant metadata and ownerName
- /incidents/:id (unchanged semantics; include tenant metadata in response)
- /tenants
  - Return UI‑safe list [{ key, displayName, subscriptionId }]

## Frontend Changes (file‑by‑file)

### frontend/src/Dashboard.js
- Add tenant selector at top: options = [All] + list from /tenants
- Keep selected tenant in component state (simple, no global context needed)
- Fetch /incidents and filter client‑side by tenantKey when a tenant is selected
- Display columns include: time, severity, type, ownerName, tenantDisplayName, subscriptionId
- Analytics:
  - When All selected: aggregate globally across all incidents returned
  - When a tenant is selected: compute analytics on filtered subset

### frontend/src/components/LiveAgentFeed.js
- Filter feed client‑side by selected tenant using tenantKey in each event payload
- SSE remains global broadcast; selection does not affect backend

### frontend/src/components/ReportDisplay.js
- Show tenant metadata (tenantDisplayName, subscriptionId, resourceGroup, workspaceName) and ownerName
- Respect selected tenant filtering at the parent level (do not fetch differently)

## Incident Lifecycle (tenant‑aware)
1) Receive payload at /analyse
2) Extract subscriptionId from ARM path in id or name
3) Resolve tenantCtx by subscriptionId
4) Emit initial SSE/logs with tenantKey and subscriptionId
5) Run AI analysis (unchanged provider configuration)
6) Update Sentinel using tenantCtx: per‑tenant token, workspace, and owner assignment
7) Send acknowledgement email using global SENDGRID_FROM_EMAIL → tenantCtx.customerMail.toSenderMail (multi‑recipient)
8) Store incident with tenant metadata for UI
9) Emit final SSE/logs with status and metrics

## Token Management (per tenant)
- Cache tokens per tenant (keyed by tenantKey)
- Early refresh (buffer before expiry)
- On 401 from Azure: clear only that tenant’s cache and retry once
- Never share tokens across tenants

## Logging and Observability
- Every log/event entry includes (at minimum):
  - timestamp, level, requestId, tenantKey, subscriptionId, incidentId, route|action
  - stage, severity, ownerEmail, customerEmails (multi‑recipient), status, durationMs,
    httpStatus, errorCode, errorMessage, correlationId (if provided by Azure)
- JSON line format for easy grepping and machine parsing
- Output to console and backend/logs files

## Error Handling
- Unknown tenant for subscriptionId: HTTP 400 with requestId and subscriptionId in body and logs
- Azure auth error for a tenant: structured error with tenantKey and correlationId; auto‑retry once after clearing that tenant’s token
- Sentinel update errors: log with tenantKey, subscriptionId, incidentId; include guidance based on status codes (401/403/404/400)
- Email delivery errors: log tenantKey, senderEmail (global SENDGRID_FROM_EMAIL), recipients, provider response

## Performance Considerations
- Single in‑memory registry for tenants for O(1) lookups
- Minimal Azure API calls (reuse per‑tenant tokens)
- Avoid redundant GETs for Sentinel when incident data is already available from /analyse
- UI uses client‑side filtering to avoid extra backend cost

## Security Considerations
- tenantId/clientId/clientSecret are per tenant; never logged in plaintext
- Mask sensitive values in debug logs (suffix only)
- TENANTS_JSON may be used in secure environments; still requires restart
- ownerEmail is not used for notifications to avoid accidental leakage

## Testing & Validation (Phase 1)
- Tenant resolution
  - For each configured tenant, send a sample incident with its subscriptionId -> expect correct tenantCtx resolved
- Sentinel update
  - Verify URL path uses the correct subscriptionId/resourceGroup/workspaceName per tenant
  - Confirm owner assignment uses ownerEmail per tenant
- Email notifications
  - Confirm sender is the global SENDGRID_FROM_EMAIL and recipients are all customerMail.toSenderMail
- SSE and UI
  - Ensure events include tenantKey/subscriptionId; frontend filters correctly
- Error cases
  - Unknown subscriptionId -> 400
  - Invalid tenant credentials -> logged with tenantKey and correlationId; single retry behavior observed

## Rollout Steps
1) Create backend/config/tenants.json with two tenants
2) Start server (no hot‑reload); verify /tenants returns expected entries
3) Post a sample incident for each tenant; verify logs, Sentinel operations, and emails
4) Validate dashboard shows tenant metadata, ownerName, and client‑side filtering
5) Monitor logs for structured fields and correlation IDs

## Future Work (not included now)
- Persist incidents in MongoDB (schema already carries tenant metadata)
- Add user authentication and role‑based access (admin, read‑only)
- Server‑side filtering and pagination for /incidents
- Health endpoints per tenant (Sentinel connectivity), and manual reload when using TENANTS_JSON
- Secrets manager integration for tenant credentials
- Support multi‑workspace per subscription if needed later

## Acceptance Criteria
- Tenant is resolved from Subscription ID for every incident
- All Azure calls and updates use the resolved tenant’s credentials and workspace scope
- Tokens are isolated per tenant
- Emails are sent from the global SENDGRID_FROM_EMAIL to all customer recipient emails, never to ownerEmail
- /incidents returns all incidents with tenant metadata; UI filters correctly
- Logs consistently include requestId, tenantKey, subscriptionId, incidentId, stage, severity, ownerEmail, and customerEmails


