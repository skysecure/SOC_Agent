import React, { useMemo, useState, useEffect, useRef } from 'react';
import './ReportDisplay.css';

function JsonRenderer({ data, depth = 0 }) {
  if (data === null || data === undefined) {
    return <span className="json-null">null</span>;
  }

  if (typeof data === 'string') {
    return <span className="json-string">{data}</span>;
  }

  if (typeof data === 'number') {
    return <span className="json-number">{data}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="json-boolean">{data.toString()}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="json-empty">[]</span>;
    }

    const isPrimitiveArray = data.every(item =>
      typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    );

    if (isPrimitiveArray) {
      return (
        <ul className="json-array-list">
          {data.map((item, idx) => (
            <li key={idx}><JsonRenderer data={item} depth={depth + 1} /></li>
          ))}
        </ul>
      );
    }

    return (
      <div className="json-array">
        {data.map((item, idx) => (
          <div key={idx} className="json-array-item">
            <div className="json-array-index">[{idx}]</div>
            <JsonRenderer data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="json-empty">{}</span>;
    }

    return (
      <div className="json-object" style={{ marginLeft: depth > 0 ? '1rem' : '0' }}>
        {entries.map(([key, value]) => {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/_/g, ' ');

          return (
            <div key={key} className="json-property">
              <div className="json-key">{formattedKey}:</div>
              <div className="json-value">
                <JsonRenderer data={value} depth={depth + 1} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="json-unknown">{String(data)}</span>;
}

function ReportDisplay({ report }) {
  const [openState, setOpenState] = useState({});
  const [criticalOnly, setCriticalOnly] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeKey, setActiveKey] = useState('');
  const [showToTop, setShowToTop] = useState(false);
  const stickyRef = useRef(null);
  const preferredOrder = [
    'executiveSummary',
    'severityAssessment',
    'sentinelAssignment',
    'incidentDetails',
    'timelineOfEvents',
    'detectionDetails',
    'attackVectorAndTechniques',
    'rootCauseAnalysis',
    'impactAssessment',
    'containmentAndRemediation',
    'verdict',
    'actionsTaken',
    'recommendedActions',
    'preventionMeasures',
    'evidenceAndArtifacts',
    'additionalDataRequirements'
  ];

  const allKeys = Object.keys(report || {});
  const sortedKeys = [
    ...preferredOrder.filter(key => allKeys.includes(key)),
    ...allKeys.filter(key => !preferredOrder.includes(key))
  ];

  // Never show Full RCA Report section
  const baseKeys = useMemo(() => sortedKeys.filter(k => k !== 'fullRCAReport'), [sortedKeys]);

  const titlesByKey = useMemo(() => {
    const map = {};
    baseKeys.forEach((key) => {
      map[key] = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    });
    return map;
  }, [baseKeys]);

  // Define critical sections to keep in concise view
  const criticalKeys = useMemo(() => ([
    'executiveSummary',
    'severityAssessment',
    'sentinelAssignment',
    'verdict',
    'recommendedActions',
    'actionsTaken'
  ]), []);

  const displayedKeys = useMemo(() => (
    criticalOnly ? baseKeys.filter(k => criticalKeys.includes(k)) : baseKeys
  ), [baseKeys, criticalOnly, criticalKeys]);

  const isLongSection = (key) => (
    key === 'timelineOfEvents' ||
    key === 'evidenceAndArtifacts' ||
    key === 'fullRCAReport' ||
    key === 'additionalDataRequirements'
  );

  const isImportantSection = (key) => (
    key === 'executiveSummary' ||
    key === 'severityAssessment' ||
    key === 'verdict' ||
    key === 'recommendedActions' ||
    key === 'actionsTaken'
  );

  const defaultOpenFor = (key) => isImportantSection(key) && !isLongSection(key);

  const getOpen = (key) => {
    if (openState[key] === undefined) return defaultOpenFor(key);
    return openState[key];
  };

  const setAllOpen = (value) => {
    const next = {};
    displayedKeys.forEach((k) => { next[k] = !!value; });
    setOpenState(next);
  };

  const getSeverityClass = (level) => {
    if (!level) return '';
    const severity = typeof level === 'string' ? level.toLowerCase() : '';
    if (severity === 'critical') return 'severity-critical';
    if (severity === 'high') return 'severity-high';
    if (severity === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  // Quick overview values
  const initialSeverity = report?.severityAssessment?.initialSeverity || report?.severity;
  const aiSeverity = report?.severityAssessment?.aiAssessedSeverity;
  const verdictText = typeof report?.verdict === 'string' ? report.verdict : null;

  useEffect(() => {
    const rootEl = stickyRef.current;
    if (!rootEl) return;

    const modalScrollContainer = rootEl.closest('.modal-report-container');
    const scrollTarget = modalScrollContainer || window;

    const onScroll = () => {
      const scrolledAmount = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
      setIsScrolled(scrolledAmount > 2);
      setShowToTop(scrolledAmount > 600);
    };

    onScroll();
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Highlight current section in nav when scrolling
  useEffect(() => {
    const modalScrollContainer = stickyRef.current?.closest('.modal-report-container');
    const root = modalScrollContainer || null;
    const options = { root, threshold: 0.6 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id?.replace('section-', '');
          if (id) setActiveKey(id);
        }
      });
    }, options);
    const elements = (displayedKeys || []).map(k => document.getElementById(`section-${k}`)).filter(Boolean);
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [displayedKeys]);

  // Helper: counts to show on chips
  const sectionCounts = useMemo(() => {
    // Safe handling of recommendedActions
    let recommendedActionsCount = 0;
    if (report?.recommendedActions && typeof report.recommendedActions === 'object' && !Array.isArray(report.recommendedActions)) {
      const immediate = Array.isArray(report.recommendedActions.immediate) ? report.recommendedActions.immediate : [];
      const shortTerm = Array.isArray(report.recommendedActions.shortTerm) ? report.recommendedActions.shortTerm : [];
      const longTerm = Array.isArray(report.recommendedActions.longTerm) ? report.recommendedActions.longTerm : [];
      recommendedActionsCount = [...immediate, ...shortTerm, ...longTerm].length;
    } else if (Array.isArray(report?.recommendedActions)) {
      // Handle case where recommendedActions is directly an array
      recommendedActionsCount = report.recommendedActions.length;
    }

    return {
      timelineOfEvents: Array.isArray(report?.timelineOfEvents) ? report.timelineOfEvents.length : 0,
      recommendedActions: recommendedActionsCount,
      evidenceAndArtifacts: Array.isArray(report?.evidenceAndArtifacts?.iocs) ? report.evidenceAndArtifacts.iocs.length : 0
    };
  }, [report]);

  const chipLabel = (key) => {
    const base = titlesByKey[key];
    const count = sectionCounts[key];
    return typeof count === 'number' && count > 0 ? `${base} (${count})` : base;
  };

  return (
    <div className={`report-content modern-report`}>
      {/* Sticky Header (Overview + Navigator) */}
      <div ref={stickyRef} className="report-sticky-header">
        <div className={`overview-bar ${isScrolled ? 'scrolled' : ''}`}>
          <div className="overview-item">
          <span className="overview-label">Initial Severity</span>
          <span className={`severity-badge ${getSeverityClass(initialSeverity)}`}>{initialSeverity || '—'}</span>
          </div>
          <div className="overview-item">
          <span className="overview-label">AI Severity</span>
          <span className={`severity-badge ${getSeverityClass(aiSeverity)}`}>{aiSeverity || '—'}</span>
          </div>
          {verdictText && (
            <div className="overview-item">
              <span className="overview-label">Verdict</span>
              <span className={`verdict-chip ${verdictText.toLowerCase().includes('false') ? 'false' : verdictText.toLowerCase().includes('true') ? 'true' : 'maybe'}`}>{verdictText}</span>
            </div>
          )}
          <div className="overview-spacer" />
          <div className="overview-actions">
            <button className="toolbar-btn" onClick={() => setAllOpen(true)}>Expand all</button>
            <button className="toolbar-btn" onClick={() => setAllOpen(false)}>Collapse all</button>
            <label className="compact-toggle" title="Show only critical sections">
              <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} />
              <span>Critical only</span>
            </label>
          </div>
        </div>

        {/* Section Navigator */}
        <div className="section-nav">
          <div className={`nav-container ${isScrolled ? 'scrolled' : ''}`}>
            <div className="nav-chips">
              {displayedKeys.map((key) => (
                <button
                  key={key}
                  className={`nav-chip ${activeKey === key ? 'active' : ''}`}
                  onClick={() => {
                    const el = document.getElementById(`section-${key}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  title={titlesByKey[key]}
                >
                  {chipLabel(key)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {displayedKeys.map((key, index) => {
        const value = report[key];
        const title = titlesByKey[key];

        if (key === 'executiveSummary' && typeof value === 'string') {
          return (
            <section id={`section-${key}`} key={key} className="report-card" style={{ animationDelay: `${index * 0.03}s` }}>
              <div className="section-header" onClick={() => setOpenState(s => ({ ...s, [key]: !getOpen(key) }))}>
                <div className="section-icon">🧭</div>
                <h3>{title}</h3>
                <button className="toggle-btn" aria-label="toggle section">{getOpen(key) ? '−' : '+'}</button>
              </div>
              <div className={`section-body ${getOpen(key) ? 'open' : ''}`}>
                <p className="executive-summary">{value}</p>
              </div>
            </section>
          );
        }

        if (key === 'severityAssessment' && typeof value === 'object') {
          const severityMatch = value.severityMatch;
          return (
            <section id={`section-${key}`} key={key} className="report-card" style={{ animationDelay: `${index * 0.03}s` }}>
              <div className="section-header" onClick={() => setOpenState(s => ({ ...s, [key]: !getOpen(key) }))}>
                <div className="section-icon">📊</div>
                <h3>{title}</h3>
                <button className="toggle-btn" aria-label="toggle section">{getOpen(key) ? '−' : '+'}</button>
              </div>
              <div className={`section-body ${getOpen(key) ? 'open' : ''}`}>
              <div className="severity-comparison">
                <div className="severity-item">
                  <span className="severity-label">Initial Severity:</span>
                  <div className={`severity-badge ${getSeverityClass(value.initialSeverity)}`}>
                    {value.initialSeverity}
                  </div>
                </div>
                <div className="severity-arrow">→</div>
                <div className="severity-item">
                  <span className="severity-label">AI-Assessed Severity:</span>
                  <div className={`severity-badge ${getSeverityClass(value.aiAssessedSeverity)}`}>
                    {value.aiAssessedSeverity}
                  </div>
                </div>
                {!severityMatch && (
                  <div className="severity-change-indicator">Changed</div>
                )}
              </div>
              </div>
              {getOpen(key) && value.justification && (
                <div className="severity-justification">
                  <strong>Assessment Rationale:</strong> {value.justification}
                </div>
              )}
            </section>
          );
        }

        if (key === 'sentinelAssignment' && value) {
          return (
            <section id={`section-${key}`} key={key} className="report-card" style={{ animationDelay: `${index * 0.03}s` }}>
              <div className="section-header" onClick={() => setOpenState(s => ({ ...s, [key]: !getOpen(key) }))}>
                <div className="section-icon">🔐</div>
                <h3>Sentinel Auto-Assignment</h3>
                <button className="toggle-btn" aria-label="toggle section">{getOpen(key) ? '−' : '+'}</button>
              </div>
              <div className={`section-body ${getOpen(key) ? 'open' : ''}`}>
              <div className={`assignment-result ${value.success ? 'success' : 'error'}`}>
                {value.success ? (
                  <>
                    <div className="status-icon">✅</div>
                    <div className="assignment-details">
                      <p><strong>Status:</strong> Successfully assigned</p>
                      <p><strong>Assigned to:</strong> {value.assignedTo}</p>
                      <p><strong>Severity updated to:</strong> {value.severity}</p>
                      <p><strong>Incident ID:</strong> {value.incidentId}</p>
                      <p><strong>Timestamp:</strong> {new Date(value.timestamp).toLocaleString()}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="status-icon">❌</div>
                    <div className="assignment-details">
                      <p><strong>Status:</strong> Assignment failed</p>
                      <p><strong>Error:</strong> {value.error}</p>
                      {value.status === 404 && (
                        <p className="error-hint">Incident not found in Sentinel. Verify the incident ID.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              </div>
            </section>
          );
        }

        if (key === 'verdict' && typeof value === 'string') {
          const verdictClass = value.toLowerCase().includes('false') ? 'verdict-false-positive' :
                              value.toLowerCase().includes('true') ? 'verdict-true-positive' :
                              'verdict-inconclusive';
          return (
            <section id={`section-${key}`} key={key} className="report-card" style={{ animationDelay: `${index * 0.03}s` }}>
              <div className="section-header" onClick={() => setOpenState(s => ({ ...s, [key]: !getOpen(key) }))}>
                <div className="section-icon">⚖️</div>
                <h3>Verdict</h3>
                <button className="toggle-btn" aria-label="toggle section">{getOpen(key) ? '−' : '+'}</button>
              </div>
              <div className={`section-body ${getOpen(key) ? 'open' : ''}`}>
                <div className={`verdict-badge ${verdictClass}`}>{value}</div>
              </div>
              {getOpen(key) && report.verdictRationale && (
                <div className="verdict-rationale">
                  <strong>Rationale:</strong> {report.verdictRationale}
                </div>
              )}
            </section>
          );
        }

        if (key === 'timelineOfEvents' && Array.isArray(value)) {
          return (
            <section id={`section-${key}`} key={key} className="report-card" style={{ animationDelay: `${index * 0.03}s` }}>
              <div className="section-header" onClick={() => setOpenState(s => ({ ...s, [key]: !getOpen(key) }))}>
                <div className="section-icon">🕑</div>
                <h3>{title}</h3>
                <button className="toggle-btn" aria-label="toggle section">{getOpen(key) ? '−' : '+'}</button>
              </div>
              <div className={`section-body ${getOpen(key) ? 'open' : ''}`}>
              <div className="timeline-table">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp (UTC)</th>
                      <th>Source</th>
                      <th>Event/Action</th>
                      <th>Notes</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {value.map((event, idx) => (
                      <tr key={idx}>
                        <td>{event.timestamp || event.time || '-'}</td>
                        <td>{event.source || '-'}</td>
                        <td>{event.eventAction || event.event || event.description || '-'}</td>
                        <td>{event.notes || '-'}</td>
                        <td>
                          <span className={`confidence-${(event.confidence || 'unknown').toLowerCase()}`}>
                            {event.confidence || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </section>
          );
        }

        if (key === 'evidenceAndArtifacts' && typeof value === 'object') {
          return (
            <section id={`section-${key}`} key={key} className="report-card" style={{ animationDelay: `${index * 0.03}s` }}>
              <div className="section-header" onClick={() => setOpenState(s => ({ ...s, [key]: !getOpen(key) }))}>
                <div className="section-icon">🧪</div>
                <h3>{title}</h3>
                <button className="toggle-btn" aria-label="toggle section">{getOpen(key) ? '−' : '+'}</button>
              </div>
              <div className={`section-body ${getOpen(key) ? 'open' : ''}`}>
              {value.logFieldInterpretation && Array.isArray(value.logFieldInterpretation) && (
                <div className="subsection">
                  <h4>Log Field Interpretation</h4>
                  <table className="log-interpretation-table">
                    <thead>
                      <tr>
                        <th>Field Name</th>
                        <th>Value</th>
                        <th>Interpretation</th>
                        <th>Significance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {value.logFieldInterpretation.map((field, idx) => (
                        <tr key={idx}>
                          <td>{field.fieldName || '-'}</td>
                          <td>{field.value || '-'}</td>
                          <td>{field.interpretation || '-'}</td>
                          <td>{field.significance || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {getOpen(key) && value.entityAppendices && (
                <div className="entity-appendices">
                  {value.entityAppendices.ipAddresses && value.entityAppendices.ipAddresses.length > 0 && (
                    <div className="subsection">
                      <h4>IP Address Analysis</h4>
                      <table>
                        <thead>
                          <tr>
                            <th>IP Address</th>
                            <th>Geolocation</th>
                            <th>Reputation</th>
                            <th>First Seen</th>
                            <th>Last Seen</th>
                            <th>Activity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {value.entityAppendices.ipAddresses.map((ip, idx) => (
                            <tr key={idx}>
                              <td>{ip.address || '-'}</td>
                              <td>{ip.geolocation || '-'}</td>
                              <td className={`reputation-${(ip.reputation || 'unknown').toLowerCase()}`}>
                                {ip.reputation || '-'}
                              </td>
                              <td>{ip.firstSeen || '-'}</td>
                              <td>{ip.lastSeen || '-'}</td>
                              <td>{ip.activity || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {getOpen(key) && <JsonRenderer data={value} />}
              </div>
            </section>
          );
        }

        // followUpTasks intentionally removed

        return (
          <section id={`section-${key}`} key={key} className="report-card" style={{ animationDelay: `${index * 0.03}s` }}>
            <div className="section-header" onClick={() => setOpenState(s => ({ ...s, [key]: !getOpen(key) }))}>
              <div className="section-icon">📁</div>
              <h3>{title}</h3>
              <button className="toggle-btn" aria-label="toggle section">{getOpen(key) ? '−' : '+'}</button>
            </div>
            <div className={`section-body ${getOpen(key) ? 'open' : ''}`}>
              <JsonRenderer data={value} />
            </div>
          </section>
        );
      })}

      {showToTop && (
        <button
          className="to-top-button"
          onClick={() => {
            const modalScrollContainer = stickyRef.current?.closest('.modal-report-container');
            if (modalScrollContainer) {
              modalScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          title="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}

export default ReportDisplay;


