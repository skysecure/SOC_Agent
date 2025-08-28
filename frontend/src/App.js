import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

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

    try {
      const parsedData = JSON.parse(incidentData);
      const response = await axios.post('http://10.99.8.8:3002/analyse', parsedData);
      setReport(response.data);
    } catch (err) {
      setError(err.message.includes('JSON') ? 'Invalid JSON format' : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityClass = (level) => {
    const severity = level?.toLowerCase();
    if (severity === 'critical') return 'severity-critical';
    if (severity === 'high') return 'severity-high';
    if (severity === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>SOC Incident Analyzer</h1>
        <p>Security Operations Center - Automated Incident Analysis</p>
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
            
            <div className="report-content">
              <div className="report-block">
                <h3>Executive Summary</h3>
                <p>{report.executiveSummary}</p>
              </div>

              <div className="report-block">
                <h3>Severity Assessment</h3>
                <div className={`severity-badge ${getSeverityClass(report.severityAssessment?.level)}`}>
                  {report.severityAssessment?.level || 'Unknown'}
                </div>
                <p>{report.severityAssessment?.justification}</p>
              </div>

              <div className="report-block">
                <h3>Incident Details</h3>
                <pre>{JSON.stringify(report.incidentDetails, null, 2)}</pre>
              </div>

              <div className="report-block">
                <h3>Root Cause Analysis</h3>
                <div className="analysis-content">
                  {typeof report.rootCauseAnalysis === 'object' ? (
                    <div>
                      <h4>Technical Analysis</h4>
                      <p>{report.rootCauseAnalysis.technicalAnalysis}</p>
                      
                      <h4>Attack Vector</h4>
                      <p>{report.rootCauseAnalysis.attackVector}</p>
                      
                      <h4>Contributing Factors</h4>
                      <ul>
                        {report.rootCauseAnalysis.contributingFactors?.map((factor, idx) => (
                          <li key={idx}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>{report.rootCauseAnalysis}</p>
                  )}
                </div>
              </div>

              <div className="report-block">
                <h3>Impact Assessment</h3>
                {typeof report.impactAssessment === 'object' ? (
                  <div>
                    {Object.entries(report.impactAssessment).map(([key, value]) => (
                      <div key={key} className="impact-item">
                        <h4>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                        <p>{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{report.impactAssessment}</p>
                )}
              </div>

              <div className="report-block">
                <h3>Recommended Actions</h3>
                <div className="actions-grid">
                  <div>
                    <h4>Immediate Actions</h4>
                    <ul>
                      {report.recommendedActions?.immediate?.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Long-term Remediation</h4>
                    <ul>
                      {report.recommendedActions?.longTerm?.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="report-block">
                <h3>Prevention Measures</h3>
                <ul>
                  {report.preventionMeasures?.map((measure, idx) => (
                    <li key={idx}>{measure}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;