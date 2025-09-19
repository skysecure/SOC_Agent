import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import ReportDisplay from './components/ReportDisplay';
import { API_BASE_URL } from './config';
const API_URL = API_BASE_URL;
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


function App() {
  const [incidentData, setIncidentData] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const parsedData = JSON.parse(incidentData);
      const response = await axios.post(`${API_URL}/analyse`, parsedData);
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
      submittingRef.current = false;
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