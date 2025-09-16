import React, { useEffect, useRef, useState } from 'react';

const IP = process.env.IP || "localhost";
const PORT = process.env.PORT || "3002";

const STAGES = [
  'INCIDENT_RECEIVED',
  'PIPELINE_STARTED',
  'ACK_PREPARED',
  'ACK_SENT',
  'RCA_SEVERITY_STARTED',
  'RCA_SEVERITY_COMPLETED',
  'SENTINEL_UPDATE_STARTED',
  'SENTINEL_UPDATED',
  'RCA_EMAIL_PREPARED',
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

function Toast({ pipeline }) {
  const { requestId, incidentId, events, stageState, meta } = pipeline;
  const lastLines = events.slice(-3);
  const ai = meta?.aiSeverity;
  const owner = meta?.owner;

  // First-seen timestamps for each stage
  const firstTsByStage = {};
  for (const ev of events) {
    if (!firstTsByStage[ev.stage]) firstTsByStage[ev.stage] = ev.ts;
  }

  const headerId = meta?.incidentNumber || incidentId || 'New Incident';

  return (
    <div style={{
      background: '#111827',
      color: '#e5e7eb',
      border: '1px solid #1f2937',
      borderRadius: 10,
      padding: 12,
      marginTop: 10,
      width: 380,
      boxShadow: '0 10px 20px rgba(0,0,0,0.35)'
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        {`Incident ${headerId}`} {ai ? `• AI: ${ai}` : ''} {owner ? `• Owner: ${owner}` : ''}
        <span style={{ color: '#9ca3af', fontWeight: 400 }}>{` • Req: ${requestId || ''}`}</span>
      </div>

      {/* Vertical timeline */}
      <div>
        {STAGES.map(stage => {
          const state = stageState[stage] || 'pending';
          const icon = getStageIcon(state);
          const ts = firstTsByStage[stage];
          const color = state === 'done' ? '#10b981' : state === 'error' ? '#ef4444' : state === 'skipped' ? '#9ca3af' : state === 'in_progress' ? '#3b82f6' : '#6b7280';
          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
              <span style={{ width: 16, color }}>{icon}</span>
              <span style={{ flex: 1, marginLeft: 6 }}>{stage.replace(/_/g, ' ')}</span>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>{ts ? new Date(ts).toLocaleTimeString() : ''}</span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.35, marginTop: 8 }}>
        {lastLines.map(ev => (
          <div key={ev.eventId}>{new Date(ev.ts).toLocaleTimeString()} {ev.stage} {ev.message ? `- ${ev.message}` : ''}</div>
        ))}
      </div>
    </div>
  );
}

export default function LiveAgentFeed({ selectedTenantKey = 'ALL' }) {
  const [pipelines, setPipelines] = useState({}); // requestId -> {requestId, incidentId, events, stageState, meta}
  const [isOpen, setIsOpen] = useState(true);
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

  const items = Object.values(pipelines)
    .sort((a, b) => (b.events[b.events.length - 1]?.eventId || 0) - (a.events[a.events.length - 1]?.eventId || 0))
    .filter(p => {
      if (selectedTenantKey === 'ALL') return true;
      const last = p.events[p.events.length - 1];
      const tk = last?.tenantKey || last?.meta?.tenantKey || p.meta?.tenantKey;
      return tk === selectedTenantKey;
    })
    .slice(0, 5);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 16,
      bottom: 16,
      zIndex: 1000,
      pointerEvents: 'none'
    }}>
      <div style={{ pointerEvents: 'auto', position: 'relative' }}>
        <button
          onClick={() => setIsOpen(false)}
          title="Close live updates"
          style={{
            position: 'absolute',
            right: 0,
            top: -8,
            width: 24,
            height: 24,
            borderRadius: 12,
            border: '1px solid #374151',
            background: '#111827',
            color: '#e5e7eb',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
        {items.map(p => {
          return <Toast key={p.requestId || p.incidentId} pipeline={p} />;
        })}
      </div>
    </div>
  );
}


