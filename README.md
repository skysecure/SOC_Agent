# SOC Incident Analyzer (concise)

AI-assisted SOC tool that ingests incident JSON, generates an RCA and severity, optionally updates Sentinel, and streams live pipeline updates to the dashboard via SSE.

## Key features
- RCA + AI severity assessment (Gemini/OpenAI)
- Outlook-safe RCA email (ack + final)
- Optional Sentinel auto-update
- Live incident overlay with 11-stage timeline (SSE)
- Threat intelligence view per incident
- AI chat with incident context

## Tech
- Backend: Node/Express, SSE, SendGrid, Azure (Sentinel), Gemini/OpenAI
- Frontend: React, EventSource overlay timeline

## Quick start
### Backend
1. `cd backend && npm install`
2. Copy `.env.example` to `.env` and set keys (see Env)
3. `npm run dev`

### Frontend
1. `cd frontend && npm install`
2. `npm start`

## Env (backend)
- Core: `PORT=3002`, `GEMINI_API_KEY=...`, `AI_PROVIDER=gemini|openai`
- Email: `SENDGRID_API_KEY=...`, `SENDGRID_FROM_EMAIL=...`, `TOSENDERMAIL=...`
- Sentinel (optional): `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `AZURE_WORKSPACE_NAME`, `SENTINEL_OWNER_EMAIL`, `SENTINEL_OWNER_UPN`, `SENTINEL_OWNER_OBJECT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_MANAGEMENT_API_URL`, `SENTINEL_API_VERSION`

  - Runtime Base URL configuration:
    - Backend `.env`:
      - `ENV=DEVELOPMENT`
      - `IP=192.168.0.66`
      - `PORT=3002`
      - `AZURE_APP_SERVICE=<domain>`
      - Computed: `PUBLIC_BASE_URL = (ENV === 'DEVELOPMENT') ? \`${IP}:${PORT}\` : \`${AZURE_APP_SERVICE}\``
    - Frontend `.env.local`:
      - `REACT_APP_ENV=DEVELOPMENT`
      - `REACT_APP_IP=192.168.0.66`
      - `REACT_APP_PORT=3002`
      - `REACT_APP_AZURE_APP_SERVICE=<domain>`
      - Computed: `API_BASE_URL = (REACT_APP_ENV === 'DEVELOPMENT') ? http://${REACT_APP_IP}:${REACT_APP_PORT} : https://${REACT_APP_AZURE_APP_SERVICE}`
- SSE (optional): `SSE_HEARTBEAT_MS`, `SSE_GLOBAL_HISTORY`, `SSE_PIPELINE_HISTORY`

## How it works (pipeline)
POST `/analyse` → stages:
`INCIDENT_RECEIVED → PIPELINE_STARTED → ACK_PREPARED → ACK_SENT → RCA_SEVERITY_STARTED → RCA_SEVERITY_COMPLETED → SENTINEL_UPDATE_STARTED → SENTINEL_UPDATED → RCA_EMAIL_PREPARED → RCA_EMAIL_SENT → PIPELINE_COMPLETED`

The dashboard overlay subscribes to `/agent/stream` and shows a timestamped vertical timeline. RCA email is generated and sent; Sentinel is updated when configured.

## UI
- Dashboard table unchanged
- Overlay at bottom-right; close with ×
- Report modal shows full RCA; Threat Intel tab available per incident

## Debug/ops
- Email debug: `GET /debug/emails`, `GET /debug/emails/:incidentId`
- Sentinel health: `GET /sentinel/health`
- Threat intel: `GET /api/threat-intelligence/:incidentId`

## Notes
- For SSE, set LB/proxy idle timeout ≥ 10–15 min; heartbeat ~20s
- Duplicate requests are short-circuited and surfaced in logs