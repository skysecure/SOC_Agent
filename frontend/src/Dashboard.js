import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';
import AIChatPanel from './components/AIChatPanel';
import ThreatIntelligence from './components/ThreatIntelligence';

// Recursive component to render any JSON structure
function JsonRenderer({ data, depth = 0 }) {
  // Handle null or undefined
  if (data === null || data === undefined) {
    return <span className="json-null">null</span>;
  }

  // Handle primitive types
  if (typeof data === 'string') {
    return <span className="json-string">{data}</span>;
  }
  
  if (typeof data === 'number') {
    return <span className="json-number">{data}</span>;
  }
  
  if (typeof data === 'boolean') {
    return <span className="json-boolean">{data.toString()}</span>;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="json-empty">[]</span>;
    }
    
    // Check if it's an array of primitives
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
    
    // Array of objects
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

  // Handle objects
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

  // Fallback for unknown types
  return <span className="json-unknown">{String(data)}</span>;
}

// Main report component that organizes sections
function ReportDisplay({ report }) {
  // Define the preferred order of top-level keys
  const preferredOrder = [
    'executiveSummary',
    'severityAssessment',
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
    'followUpTasks',
    'preventionMeasures',
    'evidenceAndArtifacts',
    'additionalDataRequirements',
    'fullRCAReport'
  ];

  // Get all keys and sort them according to preferred order
  const allKeys = Object.keys(report);
  const sortedKeys = [
    ...preferredOrder.filter(key => allKeys.includes(key)),
    ...allKeys.filter(key => !preferredOrder.includes(key))
  ];

  const getSeverityClass = (level) => {
    if (!level) return '';
    const severity = typeof level === 'string' ? level.toLowerCase() : '';
    if (severity === 'critical') return 'severity-critical';
    if (severity === 'high') return 'severity-high';
    if (severity === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  return (
    <div className="report-content">
      {sortedKeys.map(key => {
        const value = report[key];
        const title = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase());

        // Special handling for known sections
        if (key === 'executiveSummary' && typeof value === 'string') {
          return (
            <div key={key} className="report-block">
              <h3>{title}</h3>
              <p className="executive-summary">{value}</p>
            </div>
          );
        }

        if (key === 'severityAssessment' && typeof value === 'object') {
          const severityMatch = value.severityMatch;
          return (
            <div key={key} className="report-block">
              <h3>{title}</h3>
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
                  <div className="severity-change-indicator">⚠️ Changed</div>
                )}
              </div>
              {value.justification && (
                <div className="severity-justification">
                  <strong>Assessment Rationale:</strong> {value.justification}
                </div>
              )}
            </div>
          );
        }

        if (key === 'verdict' && typeof value === 'string') {
          const verdictClass = value.toLowerCase().includes('false') ? 'verdict-false-positive' : 
                              value.toLowerCase().includes('true') ? 'verdict-true-positive' : 
                              'verdict-inconclusive';
          return (
            <div key={key} className="report-block">
              <h3>Verdict</h3>
              <div className={`verdict-badge ${verdictClass}`}>
                {value}
              </div>
              {report.verdictRationale && (
                <div className="verdict-rationale">
                  <strong>Rationale:</strong> {report.verdictRationale}
                </div>
              )}
            </div>
          );
        }

        if (key === 'timelineOfEvents' && Array.isArray(value)) {
          return (
            <div key={key} className="report-block">
              <h3>{title}</h3>
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
          );
        }

        if (key === 'evidenceAndArtifacts' && typeof value === 'object') {
          return (
            <div key={key} className="report-block">
              <h3>{title}</h3>
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
              {value.entityAppendices && (
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
              <JsonRenderer data={value} />
            </div>
          );
        }

        if (key === 'followUpTasks' && Array.isArray(value)) {
          return (
            <div key={key} className="report-block">
              <h3>Follow-Up Tasks</h3>
              <table className="followup-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Owner</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {value.map((task, idx) => (
                    <tr key={idx}>
                      <td>{task.task || task.description || '-'}</td>
                      <td>{task.owner || '-'}</td>
                      <td>{task.dueDate || '-'}</td>
                      <td>
                        <span className={`priority-${(task.priority || 'medium').toLowerCase()}`}>
                          {task.priority || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-${(task.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                          {task.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (key === 'fullRCAReport' && value) {
          return (
            <div key={key} className="report-block">
              <h3>Full RCA Report</h3>
              <details>
                <summary>Click to expand full report</summary>
                <div className="full-report-content">
                  <JsonRenderer data={value} />
                </div>
              </details>
            </div>
          );
        }

        // Default rendering for all other sections
        return (
          <div key={key} className="report-block">
            <h3>{title}</h3>
            <JsonRenderer data={value} />
          </div>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState(null);
  const [quickLookIncident, setQuickLookIncident] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showThreatIntel, setShowThreatIntel] = useState(false);
  const [chatIncident, setChatIncident] = useState(null);
  const [chatMode, setChatMode] = useState('general');

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Auto-show threat intelligence when incident is selected
  useEffect(() => {
    if (selectedIncident) {
      setShowThreatIntel(true);
    }
  }, [selectedIncident]);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get('http://localhost:3002/incidents');
      setIncidents(response.data);
    } catch (err) {
      setError('Failed to fetch incidents: ' + (err.message || 'Unknown error'));
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics including both initial and AI-assessed severities
  const metrics = {
    total: incidents.length,
    // Count initial severities
    initialHigh: incidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'high';
    }).length,
    initialMedium: incidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'medium';
    }).length,
    initialLow: incidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'low';
    }).length,
    initialInformational: incidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'informational';
    }).length,
    // Count AI-assessed severities
    aiHigh: incidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'high';
    }).length,
    aiMedium: incidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'medium';
    }).length,
    aiLow: incidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'low';
    }).length,
    aiInformational: incidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'informational';
    }).length,
    // Legacy counts for backward compatibility
    high: incidents.filter(i => i.severity?.toLowerCase() === 'high').length,
    medium: incidents.filter(i => i.severity?.toLowerCase() === 'medium').length,
    low: incidents.filter(i => i.severity?.toLowerCase() === 'low').length,
    informational: incidents.filter(i => i.severity?.toLowerCase() === 'informational').length,
    closed: incidents.filter(i => i.status === 'Closed').length,
    active: incidents.filter(i => i.status === 'Active').length,
    avgResponseTime: incidents.length > 0 
      ? Math.round(incidents.reduce((sum, i) => sum + (i.responseTime || 0), 0) / incidents.length)
      : 0
  };

  // Prepare data for charts - showing both initial and AI-assessed severities
  const severityData = [
    { name: 'High', initial: metrics.initialHigh, ai: metrics.aiHigh, color: '#d32f2f' },
    { name: 'Medium', initial: metrics.initialMedium, ai: metrics.aiMedium, color: '#f57c00' },
    { name: 'Low', initial: metrics.initialLow, ai: metrics.aiLow, color: '#fbc02d' },
    { name: 'Informational', initial: metrics.initialInformational, ai: metrics.aiInformational, color: '#388e3c' }
  ];

  const statusData = [
    { name: 'Closed', value: metrics.closed, color: '#4caf50' },
    { name: 'Active', value: metrics.active, color: '#ff9800' }
  ];

  // Group incidents by date for trend chart
  const trendData = {};
  incidents.forEach(incident => {
    const date = format(new Date(incident.timestamp), 'MMM dd');
    trendData[date] = (trendData[date] || 0) + 1;
  });
  
  const trendChartData = Object.entries(trendData).map(([date, count]) => ({
    date,
    incidents: count
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  const getSeverityClass = (severity) => {
    const level = severity?.toLowerCase();
    if (level === 'high') return 'severity-high';
    if (level === 'medium') return 'severity-medium';
    if (level === 'low') return 'severity-low';
    if (level === 'informational') return 'severity-informational';
    if (level === 'unknown') return 'severity-unknown';
    return 'severity-medium'; // default
  };

  const getStatusClass = (status) => {
    if (status === 'closed') return 'status-closed';
    if (status === 'active') return 'status-active';
    return 'status-active'; // Default to active for any other status
  };

  const formatAffectedUsers = (users) => {
    if (!users) return 'N/A';
    
    // Handle array of user objects (new format)
    if (Array.isArray(users)) {
      if (users.length === 0) return 'None';
      
      // Check if it's an array of user objects with displayName/upn
      if (users[0] && typeof users[0] === 'object' && (users[0].displayName || users[0].upn)) {
        return users.map(user => {
          // Prefer displayName, fallback to upn, then other fields
          if (user.displayName) return user.displayName;
          if (user.upn) return user.upn;
          if (user.name) return user.name;
          if (user.email) return user.email;
          if (user.id) return user.id;
          return 'Unknown User';
        }).join(', ');
      }
      
      // Handle array of primitive values (old format)
      if (users.every(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
        return users.join(', ');
      }
      
      // Handle array of objects with unknown structure
      return users.map(user => {
        if (typeof user === 'string') return user;
        if (typeof user === 'number') return user.toString();
        if (typeof user === 'boolean') return user.toString();
        if (typeof user === 'object' && user !== null) {
          // Try to extract meaningful information from object
          return user.displayName || user.upn || user.name || user.email || user.id || 'Unknown User';
        }
        return 'Unknown User';
      }).join(', ');
    }
    
    // Handle single user object
    if (typeof users === 'object' && users !== null && !Array.isArray(users)) {
      return users.displayName || users.upn || users.name || users.email || users.id || 'Unknown User';
    }
    
    // Handle primitive values
    return String(users);
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>SOC Incident Dashboard</h1>
        <div className="header-actions">
          <button onClick={fetchIncidents} className="refresh-btn">↻ Refresh</button>
          <Link to="/" className="nav-btn">← Back to Analyzer</Link>
        </div>
      </header>

      <main className="dashboard-main">
        {/* AI Insights Section */}
        <section className="ai-insights-section">
          <div className="ai-insight-card">
            <div className="ai-insight-header">
              <svg className="ai-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h3 className="ai-insight-title">AI Threat Detection</h3>
            </div>
            <div className="ai-insight-content">
              <p>Active monitoring of {metrics.total} incidents with AI-powered analysis. 
                {!selectedIncident ? 
                  <strong> Select an incident from the table below to analyze.</strong> : 
                  <strong> Incident {selectedIncident.id} selected for analysis.</strong>
                }
              </p>
              <button 
                className="ai-suggestion-chip"
                onClick={() => setShowThreatIntel(!showThreatIntel)}
                style={{ marginTop: '0.5rem' }}
              >
                {showThreatIntel ? 'Hide' : 'Show'} Threat Intelligence
              </button>
            </div>
          </div>
        </section>

        {/* Show Threat Intelligence if toggled */}
        {showThreatIntel && (
          <section style={{ marginBottom: '2rem' }}>
            <ThreatIntelligence incident={selectedIncident} />
          </section>
        )}

        {/* Key Metrics */}
        <section className="metrics-section">
          <div className="metric-card total">
            <h3>Total Incidents</h3>
            <div className="metric-value">{metrics.total}</div>
            <p>Last 30 days</p>
          </div>
          <div className="metric-card high">
            <h3>High Severity</h3>
            <div className="metric-value">{metrics.high}</div>
            <p>{metrics.total > 0 ? ((metrics.high / metrics.total) * 100).toFixed(1) : 0}% of total</p>
          </div>
          <div className="metric-card closed">
            <h3>Closed</h3>
            <div className="metric-value">{metrics.closed}</div>
            <p>{metrics.total > 0 ? ((metrics.closed / metrics.total) * 100).toFixed(1) : 0}% closure rate</p>
          </div>
          <div className="metric-card response">
            <h3>Avg Response Time</h3>
            <div className="metric-value">{metrics.avgResponseTime}ms</div>
            <p>Minutes to first action</p>
          </div>
        </section>

        {/* Charts Section */}
        <section className="charts-section">
          <div className="chart-container">
            <h3>Incident Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="incidents" stroke="#3f51b5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Severity Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value,
                    name === 'initial' ? 'Initial Severity' : 'AI-Assessed Severity'
                  ]}
                />
                <Legend 
                  formatter={(value) => value === 'initial' ? 'Initial Severity' : 'AI-Assessed Severity'}
                />
                <Bar dataKey="initial" fill="#9e9e9e" name="initial" />
                <Bar dataKey="ai" fill="#3f51b5" name="ai" />
              </BarChart>
            </ResponsiveContainer>
            <div className="severity-legend">
              <p style={{fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center'}}>
                Gray bars show initial severity, Blue bars show AI-assessed severity
              </p>
            </div>
          </div>

          <div className="chart-container">
            <h3>Status Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent Incidents Table */}
        <section className="incidents-section">
          <h2>Recent Incidents</h2>
          <div className="incidents-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Incident #</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Affected Users</th>
                  <th>Summary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(incident => (
                  <tr 
                    key={incident.id} 
                    onClick={() => setSelectedIncident(incident)} 
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedIncident?.id === incident.id ? '#e0f2fe' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td>{format(new Date(incident.timestamp), 'MMM dd, HH:mm')}</td>
                    <td className="incident-number-cell">{incident.incidentNumber || 'N/A'}</td>
                    <td>{incident.type}</td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start'}}>
                        <span className={`severity-badge ${getSeverityClass(incident.severityAssessment?.initialSeverity || incident.severity)}`}>
                          Initial: {incident.severityAssessment?.initialSeverity || incident.severity || 'UNKNOWN'}
                        </span>
                        {incident.severityAssessment?.aiAssessedSeverity && (
                          <span className={`severity-badge ${getSeverityClass(incident.severityAssessment.aiAssessedSeverity)}`}>
                            AI: {incident.severityAssessment.aiAssessedSeverity}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td>{formatAffectedUsers(incident.affectedUsers)}</td>
                    <td className="summary-cell">{incident.executiveSummary}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="view-btn quick-look-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickLookIncident(incident);
                          }}
                        >
                          Quick Look
                        </button>
                        <button
                          className="view-btn detailed-view-btn"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedIncident(incident);
                            setLoadingDetails(true);
                            try {
                              const response = await axios.get(`http://localhost:3002/incidents/${incident.id}`);
                              setSelectedIncidentDetails(response.data);
                            } catch (err) {
                              console.error('Failed to fetch incident details:', err);
                              // Fallback to basic incident data
                              setSelectedIncidentDetails(null);
                            } finally {
                              setLoadingDetails(false);
                            }
                          }}
                        >
                          Detailed View
                        </button>
                        <button
                          className="view-btn ai-chat-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatIncident(incident);
                            setChatMode('incident');
                            setShowAIChat(true);
                          }}
                        >
                          AI Chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Incident Detail Modal */}
        {(quickLookIncident || selectedIncidentDetails) && (
          <div className="modal-overlay" onClick={() => {
            setQuickLookIncident(null);
            setSelectedIncidentDetails(null);
          }}>
            <div className="modal-content incident-modal" onClick={e => e.stopPropagation()}>
              <h2>Incident Analysis Report</h2>
              {loadingDetails ? (
                <div className="loading">Loading detailed report...</div>
              ) : selectedIncidentDetails?.report ? (
                <div className="modal-report-container">
                  <ReportDisplay report={selectedIncidentDetails.report} />
                </div>
              ) : quickLookIncident ? (
                <div className="incident-details">
                  <p><strong>ID:</strong> {quickLookIncident.id}</p>
                  <p><strong>Time:</strong> {format(new Date(quickLookIncident.timestamp), 'PPpp')}</p>
                  <p><strong>Type of Incident:</strong> {quickLookIncident.type}</p>
                  <p><strong>Severity:</strong> {quickLookIncident.severity}</p>
                  <p><strong>Status:</strong> {quickLookIncident.status}</p>
                  <p><strong>Response Time:</strong> {quickLookIncident.responseTime} minutes</p>
                  <p><strong>Affected Users:</strong> {formatAffectedUsers(quickLookIncident.affectedUsers)}</p>
                  <p><strong>Executive Summary:</strong> {quickLookIncident.executiveSummary}</p>
                </div>
              ) : null}
              <button className="close-btn" onClick={() => {
                setQuickLookIncident(null);
                setSelectedIncidentDetails(null);
              }}>
                Close
              </button>
            </div>
          </div>
        )}
      </main>

      {/* AI Chat Button */}
      <div 
        className="ai-chat-button" 
        onClick={() => {
          setChatMode('general');
          setChatIncident(null);
          setShowAIChat(true);
        }}
        title="Open General AI Security Chat"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
        </svg>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel 
        isOpen={showAIChat} 
        onClose={() => {
          setShowAIChat(false);
          setChatIncident(null);
          setChatMode('general');
        }}
        chatIncident={chatIncident}
        chatMode={chatMode}
        allIncidents={incidents}
      />
    </div>
  );
}

export default Dashboard;