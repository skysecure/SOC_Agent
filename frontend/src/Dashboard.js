import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get('http://10.99.8.8:3002/incidents');
      setIncidents(response.data);
    } catch (err) {
      setError('Failed to fetch incidents');
      // Use mock data for development
      setIncidents(getMockIncidents());
    } finally {
      setLoading(false);
    }
  };

  const getMockIncidents = () => {
    // Mock data for demonstration
    return [
      {
        id: '1',
        timestamp: new Date(Date.now() - 86400000 * 7),
        severity: 'HIGH',
        status: 'resolved',
        type: 'Logic App Modification',
        executiveSummary: 'User modified critical Logic App workflow',
        affectedUsers: ['user1@example.com'],
        responseTime: 45
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 86400000 * 5),
        severity: 'MEDIUM',
        status: 'investigating',
        type: 'Unauthorized Access',
        executiveSummary: 'Multiple failed login attempts detected',
        affectedUsers: ['user2@example.com', 'user3@example.com'],
        responseTime: 23
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 86400000 * 3),
        severity: 'CRITICAL',
        status: 'resolved',
        type: 'Data Exfiltration',
        executiveSummary: 'Potential data exfiltration detected',
        affectedUsers: ['admin@example.com'],
        responseTime: 12
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 86400000 * 2),
        severity: 'LOW',
        status: 'resolved',
        type: 'Policy Violation',
        executiveSummary: 'User violated security policy',
        affectedUsers: ['user4@example.com'],
        responseTime: 67
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 86400000),
        severity: 'MEDIUM',
        status: 'new',
        type: 'Suspicious Activity',
        executiveSummary: 'Unusual API activity detected',
        affectedUsers: ['service@example.com'],
        responseTime: 34
      }
    ];
  };

  // Calculate metrics
  const metrics = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === 'CRITICAL').length,
    high: incidents.filter(i => i.severity === 'HIGH').length,
    medium: incidents.filter(i => i.severity === 'MEDIUM').length,
    low: incidents.filter(i => i.severity === 'LOW').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    new: incidents.filter(i => i.status === 'new').length,
    avgResponseTime: incidents.length > 0 
      ? Math.round(incidents.reduce((sum, i) => sum + (i.responseTime || 0), 0) / incidents.length)
      : 0
  };

  // Prepare data for charts
  const severityData = [
    { name: 'Critical', value: metrics.critical, color: '#d32f2f' },
    { name: 'High', value: metrics.high, color: '#f57c00' },
    { name: 'Medium', value: metrics.medium, color: '#fbc02d' },
    { name: 'Low', value: metrics.low, color: '#388e3c' }
  ];

  const statusData = [
    { name: 'Resolved', value: metrics.resolved, color: '#4caf50' },
    { name: 'Investigating', value: metrics.investigating, color: '#ff9800' },
    { name: 'New', value: metrics.new, color: '#f44336' }
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
    if (level === 'critical') return 'severity-critical';
    if (level === 'high') return 'severity-high';
    if (level === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  const getStatusClass = (status) => {
    if (status === 'resolved') return 'status-resolved';
    if (status === 'investigating') return 'status-investigating';
    return 'status-new';
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
        {/* Key Metrics */}
        <section className="metrics-section">
          <div className="metric-card total">
            <h3>Total Incidents</h3>
            <div className="metric-value">{metrics.total}</div>
            <p>Last 30 days</p>
          </div>
          <div className="metric-card critical">
            <h3>Critical</h3>
            <div className="metric-value">{metrics.critical}</div>
            <p>{((metrics.critical / metrics.total) * 100).toFixed(1)}% of total</p>
          </div>
          <div className="metric-card resolved">
            <h3>Resolved</h3>
            <div className="metric-value">{metrics.resolved}</div>
            <p>{((metrics.resolved / metrics.total) * 100).toFixed(1)}% resolution rate</p>
          </div>
          <div className="metric-card response">
            <h3>Avg Response Time</h3>
            <div className="metric-value">{metrics.avgResponseTime}m</div>
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
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
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
                  <tr key={incident.id}>
                    <td>{format(new Date(incident.timestamp), 'MMM dd, HH:mm')}</td>
                    <td>{incident.type}</td>
                    <td>
                      <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td>{incident.affectedUsers?.join(', ') || 'N/A'}</td>
                    <td className="summary-cell">{incident.executiveSummary}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Incident Detail Modal */}
        {selectedIncident && (
          <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>Incident Details</h2>
              <div className="incident-details">
                <p><strong>ID:</strong> {selectedIncident.id}</p>
                <p><strong>Time:</strong> {format(new Date(selectedIncident.timestamp), 'PPpp')}</p>
                <p><strong>Type:</strong> {selectedIncident.type}</p>
                <p><strong>Severity:</strong> {selectedIncident.severity}</p>
                <p><strong>Status:</strong> {selectedIncident.status}</p>
                <p><strong>Response Time:</strong> {selectedIncident.responseTime} minutes</p>
                <p><strong>Summary:</strong> {selectedIncident.executiveSummary}</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedIncident(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;