# Low-Level Design (LLD) — SOC Incident Analyzer

## 1) System Overview
- React SPA + Node/Express backend
- AI providers (Gemini/OpenAI) for RCA + severity
- Optional Sentinel auto-update (Azure REST)
- Email via SendGrid (ack + final RCA)
- Live status via SSE to dashboard overlay

## 2) Components
- Frontend
  - `Dashboard` (table/charts; hosts overlay)
  - `LiveAgentFeed` (SSE overlay timeline, closeable)
  - `ReportDisplay` (RCA renderer)
  - `AIChatPanel` (contextual chat)
  - `ThreatIntelligence` (incident TI snapshot)
- Backend
  - `server.js` (routes, pipeline)
  - `services/geminiService.js` (RCA gen/normalize)
  - `services/sentinelService.js` (Sentinel update/comment)
  - `services/emailTemplateService.js` (HTML templates)
  - `services/mailService.js` (SendGrid)
  - `services/eventStream.js` (SSE bus + ring buffers)

## 3) Data Flow
```
Frontend
  POST /analyse  ─────────────▶  Backend pipeline
  EventSource /agent/stream ◀──  SSE timeline
  GET /incidents, /incidents/:id

Backend
  RCA -> Emails -> (optional) Sentinel
  Emit stages; store incident in memory
```

## 4) Pipeline Stages (11)
INCIDENT_RECEIVED → PIPELINE_STARTED → ACK_PREPARED → ACK_SENT → RCA_SEVERITY_STARTED → RCA_SEVERITY_COMPLETED → SENTINEL_UPDATE_STARTED → SENTINEL_UPDATED → RCA_EMAIL_PREPARED → RCA_EMAIL_SENT → PIPELINE_COMPLETED

Event shape:
```
{
  eventId:number, stage:string, status:'in_progress'|'done'|'error'|'skipped'|'pending',
  incidentId:string, requestId:string, ts:string,
  message:string, meta?:{ incidentNumber?:string, initialSeverity?:string, aiSeverity?:string, owner?:string, durationMs?:number, error?:string }
}
```

## 5) Backend Routes
- POST `/analyse` — run pipeline
- GET `/incidents`, GET `/incidents/:id`
- GET `/agent/stream` — SSE (history=N, heartbeat)
- GET `/api/threat-intelligence/:incidentId`
- GET `/sentinel/health`
- POST `/email/rca`
- GET `/debug/emails`, `/debug/emails/:incidentId`

SSE details:
- Headers: `text/event-stream`, `no-cache`, `keep-alive`
- Heartbeat ~20s; replay last N from global ring
- `event: agent_event`, `id: <eventId>`, `data: <json>`

## 6) Backend Modules
- `server.js`: dedupe (incidentId|logicRunId|dataHash), trackers, emits, storage
- `eventStream.js`: globalClients, globalHistory, per-pipeline history, dedupe keys; `emitStage`, `sseHandler`
- `geminiService.js`: provider switch, prompt build, JSON extract/normalize
- `sentinelService.js`: PUT update, comment, token refresh
- `emailTemplateService.js`: deterministic HTML + verification agent
- `mailService.js`: SendGrid send + structured logs

## 7) Frontend Modules
- `LiveAgentFeed`:
  - State: `pipelinesByRequestId`, `isOpen`
  - Connect: `EventSource(/agent/stream?history=50)`
  - UI: vertical timeline with first-seen timestamps; ● active, ✓ done, ! error, ≡ skipped
  - Header: `Incident <incidentNumber|id> • AI: <level> • Owner • Req: <requestId>`
  - Close (×) hides overlay; stream continues server-side
- `Dashboard`: mounts overlay; table unchanged
- `AIChatPanel`: `/ai/chat` with context
- `ThreatIntelligence`: `/api/threat-intelligence/:incidentId`

## 8) State & Storage
- In-memory `incidents[]` (demo/dev)
- Fields: originalData, report, severity, type, executiveSummary, affectedUsers, responseTime, incidentNumber, emailTracking, sentinelAssignment
- SSE histories: global (default 200) + per-pipeline (default 100)

## 9) Errors & Retries
- Stage emits with `status='error'` + `meta.error`
- Email errors -> `emailTracker.emailErrors`
- Sentinel errors -> error emit + structured log
- TI/RCA parsing logs; emergency paths where applicable

## 10) Security & Config
- CORS allow-list
- Env keys for AI/SendGrid/Azure
- LB/proxy idle timeout ≥ 600–900s; heartbeat keeps stream alive
- Feature flags: `SENTINEL_DEBUG`, SSE sizes

## 11) Scaling
- SSE: multi-instance via Redis Pub/Sub for broadcast
- Persist incidents in DB (Postgres) for prod
- Queue emails/Sentinel updates for reliability

## 12) Sequence (ASCII)
```
Frontend           Backend                Services
--------           -------                --------
POST /analyse  ->  parse+dedupe
                   emit INCIDENT_RECEIVED/PIPELINE_STARTED
                   ack html -> SendGrid (ACK_PREPARED/ACK_SENT)
                   emit RCA_SEVERITY_STARTED
                   analyzeIncident -> AI provider
                   emit RCA_SEVERITY_COMPLETED
                   store incident
                   sentinel (opt) (SENTINEL_UPDATE_STARTED/UPDATED)
                   rca html -> SendGrid (RCA_EMAIL_PREPARED/SENT)
                   emit PIPELINE_COMPLETED
EventSource <----  /agent/stream SSE (timeline events)
```

## 13) Testing Hooks
- `/debug/emails`, `/debug/emails/:incidentId`
- `/sentinel/health`
- Overlay close (×) test; reconnect & replay
