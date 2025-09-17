import React, { useEffect, useRef, useState } from 'react';
import './LiveAgentFeed.css';

const IP = process.env.IP || "localhost";
const PORT = process.env.PORT || "3002";

const STAGES = [
  'INCIDENT_RECEIVED',
  'PIPELINE_STARTED',
  'ACK_SENT',
  'RCA_SEVERITY_COMPLETED',
  'SENTINEL_UPDATED',
  'RCA_EMAIL_SENT',
  'PIPELINE_COMPLETED'
];

function getStageIcon(state) {
  if (state === 'done') return '✓';
  if (state === 'error') return '!';
  if (state === 'skipped') return '≡';
  if (state === 'in_progress') return '●';
  return '○';
}

// Display only the final segment of a long incident resource path
function formatIncidentNumber(value) {
  if (!value) return '';
  const parts = String(value).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(value);
}

function Toast({ pipeline, onClose }) {
  const { requestId, incidentId, events, stageState, meta } = pipeline;

  const lastLines = events.slice(-3);
  const ai = meta?.aiSeverity;
  const owner = meta?.owner;

  // First-seen timestamps for each stage
  const firstTsByStage = {};
  for (const ev of events) {
    if (!firstTsByStage[ev.stage]) firstTsByStage[ev.stage] = ev.ts;
  }

  const headerId = formatIncidentNumber(meta?.incidentNumber) || incidentId || 'New Incident';

  return (
    <div className="live-agent-card">
      <div className="card-header">
        <div className="header-content">
          <div className="incident-title">
            {`Incident ${headerId}`} {ai ? `• AI: ${ai}` : ''} {owner ? `• Owner: ${owner}` : ''}
          </div>
          <div className="request-id">
            {`Req: ${requestId || ''}`}
          </div>
        </div>
        <button 
          className="close-card-btn" 
          onClick={onClose}
          title="Close this incident card"
        >
          ×
        </button>
      </div>

      {/* Vertical timeline */}
      <div className="timeline-container">
        {STAGES.map(stage => {
          const state = stageState[stage] || 'pending';
          const icon = getStageIcon(state);
          const ts = firstTsByStage[stage];
          const color = state === 'done' ? '#10b981' : state === 'error' ? '#ef4444' : state === 'skipped' ? '#9ca3af' : state === 'in_progress' ? '#3b82f6' : '#6b7280';
          return (
            <div key={stage} className="timeline-item">
              <span className="stage-icon" style={{ color }}>{icon}</span>
              <span className="stage-name">{stage.replace(/_/g, ' ')}</span>
              <span className="stage-time">{ts ? new Date(ts).toLocaleTimeString() : ''}</span>
            </div>
          );
        })}
      </div>

      <div className="event-log">
        {lastLines.map(ev => (
          <div key={ev.eventId} className="event-item">
            <span className="event-time">{new Date(ev.ts).toLocaleTimeString()}</span>
            <span className="event-stage">{ev.stage}</span>
            {ev.message && <span className="event-message">- {ev.message}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LiveAgentFeed({ selectedTenantKey = 'ALL' }) {
  const [pipelines, setPipelines] = useState({}); // requestId -> {requestId, incidentId, events, stageState, meta}
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const url = `http://${IP}:${PORT}/agent/stream?scope=global&history=50`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('agent_event', (e) => {
      try {
        const data = JSON.parse(e.data);
        const key = data.requestId || data.incidentId || 'unknown';
        setPipelines(prev => {
          const current = prev[key] || { requestId: data.requestId, incidentId: data.incidentId, events: [], stageState: {}, meta: {} };
          const nextEvents = current.events.concat(data);
          const nextStage = { ...current.stageState, [data.stage]: data.status };
          const nextMeta = { ...current.meta };
          if (data.meta) {
            if (data.meta.aiSeverity) nextMeta.aiSeverity = data.meta.aiSeverity;
            if (data.meta.owner) nextMeta.owner = data.meta.owner;
            if (data.meta.initialSeverity && !nextMeta.initialSeverity) nextMeta.initialSeverity = data.meta.initialSeverity;
            if (data.meta.incidentNumber && !nextMeta.incidentNumber) nextMeta.incidentNumber = data.meta.incidentNumber;
          }
          return { ...prev, [key]: { ...current, requestId: data.requestId, incidentId: data.incidentId, events: nextEvents, stageState: nextStage, meta: nextMeta } };
        });
      } catch (err) {}
    });

    es.onerror = () => {
      // Let EventSource auto-reconnect
    };

    return () => {
      es.close();
    };
  }, []);

  const closeCard = (key) => {
    setPipelines(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const items = Object.values(pipelines)
    .sort((a, b) => (b.events[b.events.length - 1]?.eventId || 0) - (a.events[a.events.length - 1]?.eventId || 0))
    .filter(p => {
      if (selectedTenantKey === 'ALL') return true;
      const last = p.events[p.events.length - 1];
      const tk = last?.tenantKey || last?.meta?.tenantKey || p.meta?.tenantKey;
      return tk === selectedTenantKey;
    })
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <div className="live-agent-feed">
      <div className="feed-header">
        <h3 className="feed-title">Live Incidents</h3>
      </div>
      <div className="cards-container">
        {items.map(p => {
          return <Toast 
            key={p.requestId || p.incidentId} 
            pipeline={p} 
            onClose={() => closeCard(p.requestId || p.incidentId)}
          />;
        })}
      </div>
    </div>
  );
}