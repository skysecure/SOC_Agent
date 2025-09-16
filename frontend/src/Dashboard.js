import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';
import ReportDisplay from './components/ReportDisplay';
import AIChatPanel from './components/AIChatPanel';
import ThreatIntelligence from './components/ThreatIntelligence';
import LiveAgentFeed from './components/LiveAgentFeed';
import CustomDropdown from './components/CustomDropdown';

const IP = process.env.IP || "localhost";
const PORT = process.env.PORT || "3002";

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
  const [tenants, setTenants] = useState([]);
  const [selectedTenantKey, setSelectedTenantKey] = useState('ALL');

  useEffect(() => {
    fetchIncidents();
    fetchTenants();
  }, []);

  // Auto-show threat intelligence when incident is selected
  useEffect(() => {
    if (selectedIncident) {
      setShowThreatIntel(true);
    }
  }, [selectedIncident]);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(`http://${IP}:${PORT}/incidents`);
      setIncidents(response.data);
    } catch (err) {
      setError('Failed to fetch incidents: ' + (err.message || 'Unknown error'));
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`http://${IP}:${PORT}/tenants`);
      setTenants([{ key: 'ALL', displayName: 'All tenants' }, ...response.data]);
    } catch (_) {
      setTenants([{ key: 'ALL', displayName: 'All tenants' }]);
    }
  };

  const filteredIncidents = useMemo(() => {
    if (selectedTenantKey === 'ALL') return incidents;
    return incidents.filter(i => i.tenant?.key === selectedTenantKey);
  }, [incidents, selectedTenantKey]);

  // Calculate metrics including both initial and AI-assessed severities
  const metrics = {
    total: filteredIncidents.length,
    // Count initial severities
    initialHigh: filteredIncidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'high';
    }).length,
    initialMedium: filteredIncidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'medium';
    }).length,
    initialLow: filteredIncidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'low';
    }).length,
    initialInformational: filteredIncidents.filter(i => {
      const initial = i.severityAssessment?.initialSeverity || i.severity;
      return initial?.toLowerCase() === 'informational';
    }).length,
    // Count AI-assessed severities
    aiHigh: filteredIncidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'high';
    }).length,
    aiMedium: filteredIncidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'medium';
    }).length,
    aiLow: filteredIncidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'low';
    }).length,
    aiInformational: filteredIncidents.filter(i => {
      const ai = i.severityAssessment?.aiAssessedSeverity || i.severity;
      return ai?.toLowerCase() === 'informational';
    }).length,
    // Legacy counts for backward compatibility
    high: filteredIncidents.filter(i => i.severity?.toLowerCase() === 'high').length,
    medium: filteredIncidents.filter(i => i.severity?.toLowerCase() === 'medium').length,
    low: filteredIncidents.filter(i => i.severity?.toLowerCase() === 'low').length,
    informational: filteredIncidents.filter(i => i.severity?.toLowerCase() === 'informational').length,
    closed: filteredIncidents.filter(i => i.status === 'Closed').length,
    active: filteredIncidents.filter(i => i.status === 'Active').length,
    avgResponseTime: filteredIncidents.length > 0 
      ? Math.round(filteredIncidents.reduce((sum, i) => sum + (i.responseTime || 0), 0) / filteredIncidents.length)
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
  filteredIncidents.forEach(incident => {
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
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'closed' || normalized === 'resolved') return 'status-closed';
    if (normalized === 'new') return 'status-new';
    if (normalized === 'investigating') return 'status-investigating';
    if (
      normalized === 'active' ||
      normalized === 'open' ||
      normalized === 'in progress'
    ) return 'status-active';
    return 'status-active';
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
          <CustomDropdown
            options={tenants}
            value={selectedTenantKey}
            onChange={setSelectedTenantKey}
            placeholder="Select tenant"
          />
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
                  <th>Tenant</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Affected Users</th>
                  <th>Summary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map(incident => (
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
                    <td className="type-cell" title={incident.type}>{incident.type}</td>
                    <td>
                      {incident.tenant?.displayName ? (
                        <span className="badge badge-tenant" title={incident.tenant?.subscriptionId || ''}>
                          {incident.tenant.displayName}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start'}}>
                        <span className={`severity-badge outlined ${getSeverityClass(incident.severityAssessment?.initialSeverity || incident.severity)}`}>
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
                    <td>
                      {incident.tenant?.ownerName ? (
                        <span className="badge badge-owner">
                          {incident.tenant.ownerName}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {incident.affectedUsers ? (
                        <span className="badge badge-users" title={formatAffectedUsers(incident.affectedUsers)}>
                          {Array.isArray(incident.affectedUsers)
                            ? `${incident.affectedUsers.length} user${incident.affectedUsers.length === 1 ? '' : 's'}`
                            : formatAffectedUsers(incident.affectedUsers)}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="summary-cell" title={incident.executiveSummary}>{incident.executiveSummary}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="view-btn quick-look-btn icon-only"
                          aria-label="Quick Look"
                          title="Quick Look"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickLookIncident(incident);
                          }}
                        >
                          <span className="btn-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
                            </svg>
                          </span>
                        </button>
                        <button
                          className="view-btn detailed-view-btn icon-only"
                          aria-label="Detailed View"
                          title="Detailed View"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedIncident(incident);
                            setLoadingDetails(true);
                            try {
                              const response = await axios.get(`http://${IP}:${PORT}/incidents/${incident.id}`);
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
                          <span className="btn-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                          </span>
                        </button>
                        <button
                          className="view-btn ai-chat-btn icon-only"
                          aria-label="AI Chat"
                          title="AI Chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatIncident(incident);
                            setChatMode('incident');
                            setShowAIChat(true);
                          }}
                        >
                          <span className="btn-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 2H4c-1.1 0-2 .9-2 2v14l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                              <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
                            </svg>
                          </span>
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
        {(quickLookIncident || loadingDetails || selectedIncidentDetails) && (
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
                  {selectedIncidentDetails?.tenant && (
                    <div style={{ marginBottom: '1rem', fontSize: '14px', color: '#555' }}>
                      <strong>Tenant:</strong> {selectedIncidentDetails.tenant.displayName} • <strong>Subscription:</strong> {selectedIncidentDetails.tenant.subscriptionId} • <strong>Workspace:</strong> {selectedIncidentDetails.tenant.resourceGroup}/{selectedIncidentDetails.tenant.workspaceName} • <strong>Owner:</strong> {selectedIncidentDetails.tenant.ownerName}
                    </div>
                  )}
                  <ReportDisplay report={selectedIncidentDetails.report} />
                </div>
              ) : quickLookIncident ? (
                <div className="quicklook-card">
                  <div className="accent-bar" />
                  <div className="quicklook-header">
                    <div className="ql-title">
                      <span className="incident-number-chip">#{quickLookIncident.incidentNumber || quickLookIncident.id}</span>
                      <h3 className="ql-type" title={quickLookIncident.type}>{quickLookIncident.type}</h3>
                    </div>
                    <div className="ql-severity">
                      <span className={`severity-badge outlined ${getSeverityClass(quickLookIncident.severityAssessment?.initialSeverity || quickLookIncident.severity)}`}>
                        Initial: {quickLookIncident.severityAssessment?.initialSeverity || quickLookIncident.severity || 'UNKNOWN'}
                      </span>
                      {quickLookIncident.severityAssessment?.aiAssessedSeverity && (
                        <span className={`severity-badge ${getSeverityClass(quickLookIncident.severityAssessment.aiAssessedSeverity)}`}>
                          AI: {quickLookIncident.severityAssessment.aiAssessedSeverity}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="meta-row">
                    <span className="badge badge-time" title={format(new Date(quickLookIncident.timestamp), 'PPpp')}>
                      {format(new Date(quickLookIncident.timestamp), 'MMM dd, HH:mm')}
                    </span>
                    {quickLookIncident?.tenant?.displayName && (
                      <span className="badge badge-tenant" title={quickLookIncident.tenant?.subscriptionId || ''}>{quickLookIncident.tenant.displayName}</span>
                    )}
                    <span className={`status-badge ${getStatusClass(quickLookIncident.status)}`}>{quickLookIncident.status}</span>
                    {quickLookIncident?.tenant?.ownerName && (
                      <span className="badge badge-owner">{quickLookIncident.tenant.ownerName}</span>
                    )}
                    {quickLookIncident?.affectedUsers && (
                      <span className="badge badge-users" title={formatAffectedUsers(quickLookIncident.affectedUsers)}>
                        {Array.isArray(quickLookIncident.affectedUsers)
                          ? `${quickLookIncident.affectedUsers.length} user${quickLookIncident.affectedUsers.length === 1 ? '' : 's'}`
                          : formatAffectedUsers(quickLookIncident.affectedUsers)}
                      </span>
                    )}
                  </div>

                  {quickLookIncident.executiveSummary && (
                    <div className="summary-box" title={quickLookIncident.executiveSummary}>
                      <svg className="icon-inline" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
                      <div className="summary-text">{quickLookIncident.executiveSummary}</div>
                    </div>
                  )}

                  {quickLookIncident?.tenant && (
                    <div className="tenant-footnote">
                      <strong>Subscription:</strong> {quickLookIncident.tenant.subscriptionId} • <strong>Workspace:</strong> {quickLookIncident.tenant.resourceGroup}/{quickLookIncident.tenant.workspaceName}
                    </div>
                  )}
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
      {/* Live Agent Feed overlay (non-intrusive) */}
      <LiveAgentFeed selectedTenantKey={selectedTenantKey} />
    </div>
  );
}

export default Dashboard;