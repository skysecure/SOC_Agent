import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

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

function App() {
  const [incidentData, setIncidentData] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);
    http://10.217.108.8/
    try {
      const parsedData = JSON.parse(incidentData);
      const response = await axios.post('http://localhost:3002/analyse', parsedData);
      setReport(response.data);
    } catch (err) {
      if (err.message.includes('JSON')) {
        setError('Invalid JSON format. Please check your input.');
      } else if (err.response) {
        setError(`Server error: ${err.response.data.message || err.response.statusText}`);
      } else if (err.request) {
        setError('No response from server. Please check if the server is running.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>SOC Incident Analyzer</h1>
          <p>Security Operations Center - Automated Incident Analysis</p>
        </div>
        <Link to="/dashboard" className="dashboard-link">View Dashboard →</Link>
      </header>

      <main className="app-main">
        <section className="input-section">
          <h2>Incident Details</h2>
          <form onSubmit={handleSubmit}>
            <textarea
              value={incidentData}
              onChange={(e) => setIncidentData(e.target.value)}
              placeholder="Paste incident details in JSON format..."
              rows={10}
              required
            />
            <button type="submit" disabled={loading || !incidentData}>
              {loading ? 'Analyzing...' : 'Generate RCA'}
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </section>

        {report && (
          <section className="report-section">
            <h2>Security Incident Report</h2>
            {typeof report === 'object' && report !== null ? (
              <ReportDisplay report={report} />
            ) : (
              <div className="report-block">
                <p>{String(report)}</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;