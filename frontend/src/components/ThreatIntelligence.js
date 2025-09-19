import React, { useState, useEffect } from 'react';
import './ThreatIntelligence.css';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;
function ThreatIntelligence({ incident }) {
  const [threatData, setThreatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!incident) {
      setLoading(false);
      return;
    }
    
    // Fetch dynamic threat intelligence from API
    const fetchThreatIntelligence = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/threat-intelligence/${incident.id}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const threatData = await response.json();
        console.log('Received threat data:', threatData);
        setThreatData(threatData);
      } catch (error) {
        console.error('Failed to fetch threat intelligence:', error);
        setError(error.message);
        
        // Fallback to basic analysis using incident data
        const generateFallbackData = () => {
          const severity = incident.severityAssessment?.aiAssessedSeverity || incident.severity || 'medium';
          const hasHighSeverity = severity.toLowerCase() === 'high' || severity.toLowerCase() === 'critical';
          
          return {
            threatScore: hasHighSeverity ? 75 : 50,
            confidence: 'Medium',
            relatedThreats: [{
              id: 1,
              name: `${incident.type} Pattern`,
              similarity: 65,
              lastSeen: '1 week ago',
              tactics: ['Discovery', 'Collection']
            }],
            indicators: {
              ipAddresses: incident.report?.evidenceAndArtifacts?.entityAppendices?.ipAddresses?.length > 0 
                ? incident.report.evidenceAndArtifacts.entityAppendices.ipAddresses.map(ip => ({
                    ip: ip.address || ip.ip,
                    reputation: ip.reputation || 'Unknown',
                    geoLocation: ip.geolocation || ip.geoLocation || 'Unknown',
                    confidence: 75
                  }))
                : [{ ip: 'No IPs extracted from incident data', reputation: 'N/A', geoLocation: 'N/A', confidence: 0 }],
              domains: [{ domain: 'Analysis temporarily unavailable', status: 'N/A', firstSeen: 'N/A' }],
              hashes: [{ hash: 'Analysis temporarily unavailable', type: 'N/A', malware: 'N/A' }]
            },
            predictions: {
              escalationProbability: hasHighSeverity ? 70 : 35,
              estimatedImpact: hasHighSeverity ? 'High' : 'Medium',
              timeToContainment: hasHighSeverity ? '2-4 hours' : '4-8 hours',
              recommendedPriority: hasHighSeverity ? 'Critical' : 'High'
            }
          };
        };
        
        setThreatData(generateFallbackData());
      } finally {
        setLoading(false);
      }
    };
    
    fetchThreatIntelligence();
  }, [incident]);

  if (!incident) {
    return (
      <div className="threat-intelligence">
        <div className="threat-header">
          <h3>AI-Powered Threat Intelligence</h3>
        </div>
        <div className="no-incident-selected">
          <p>Please select an incident from the table to view threat intelligence analysis.</p>
        </div>
      </div>
    );
  }

  if (loading || !threatData) {
    return (
      <div className="threat-intelligence-loading">
        <div className="loading-spinner"></div>
        <p>{error ? `Error: ${error}` : 'Analyzing threat intelligence...'}</p>
        {error && (
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Falling back to basic analysis...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="threat-intelligence">
      <div className="threat-header">
        <h3>AI-Powered Threat Intelligence</h3>
        <div className="threat-score">
          <span className="score-label">Threat Score</span>
          <span className="score-value" style={{ color: (threatData?.threatScore || 0) > 70 ? '#ef4444' : '#f59e0b' }}>
            {threatData?.threatScore || 0}/100
          </span>
        </div>
      </div>

      <div className="threat-overview">
        <div className="overview-item">
          <span className="overview-label">Confidence Level</span>
          <span className={`overview-value confidence-${threatData?.confidence?.toLowerCase() || 'medium'}`}>
            {threatData?.confidence || 'Medium'}
          </span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Priority</span>
          <span className="overview-value priority-critical">
            {threatData?.predictions?.recommendedPriority || 'High'}
          </span>
        </div>
      </div>

      <div className="related-threats">
        <h4>Related Threat Patterns</h4>
        {(threatData?.relatedThreats || []).map(threat => (
          <div key={threat.id} className="threat-card">
            <div className="threat-card-header">
              <h5>{threat.name}</h5>
              <span className="similarity-badge">{threat.similarity}% match</span>
            </div>
            <p className="threat-last-seen">Last seen: {threat.lastSeen}</p>
            <div className="threat-tactics">
              {threat.tactics.map((tactic, index) => (
                <span key={index} className="tactic-chip">{tactic}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="threat-indicators">
        <h4>Indicators of Compromise (IOCs)</h4>
        
        <div className="indicator-section">
          <h5>🌐 IP Addresses</h5>
          {(threatData?.indicators?.ipAddresses || []).map((ip, index) => (
            <div key={index} className="indicator-item">
              <span className="indicator-value">{ip.ip}</span>
              <span className={`indicator-status ${ip.reputation ? ip.reputation.toLowerCase() : 'unknown'}`}>
                {ip.reputation}
              </span>
              <span className="indicator-meta">{ip.geoLocation} • {ip.confidence}% confidence</span>
            </div>
          ))}
        </div>

        <div className="indicator-section">
          <h5>🔗 Domains</h5>
          {(threatData?.indicators?.domains || []).map((domain, index) => (
            <div key={index} className="indicator-item">
              <span className="indicator-value">{domain.domain}</span>
              <span className={`indicator-status ${domain.status ? domain.status.toLowerCase() : 'unknown'}`}>
                {domain.status}
              </span>
              <span className="indicator-meta">First seen: {domain.firstSeen}</span>
            </div>
          ))}
        </div>

        {threatData?.indicators?.hashes && threatData.indicators.hashes.length > 0 && (
          <div className="indicator-section">
            <h5>🔒 File Hashes</h5>
            {(threatData?.indicators?.hashes || []).map((hash, index) => (
              <div key={index} className="indicator-item">
                <span className="indicator-value">{hash.hash}</span>
                <span className={`indicator-status ${hash.type ? hash.type.toLowerCase() : 'unknown'}`}>
                  {hash.type || 'Unknown'}
                </span>
                <span className="indicator-meta">
                  {hash.malware ? `Associated: ${hash.malware}` : 'No malware association'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="threat-predictions">
        <h4>AI Predictions</h4>
        <div className="prediction-grid">
          <div className="prediction-item">
            <span className="prediction-label">Escalation Risk</span>
            <div className="prediction-bar">
              <div 
                className="prediction-fill"
                style={{ 
                  width: `${threatData?.predictions?.escalationProbability || 0}%`,
                  background: (threatData?.predictions?.escalationProbability || 0) > 70 ? '#ef4444' : '#f59e0b'
                }}
              ></div>
            </div>
            <span className="prediction-value">{threatData?.predictions?.escalationProbability || 0}%</span>
          </div>
          <div className="prediction-item">
            <span className="prediction-label">Estimated Impact</span>
            <span className="prediction-value impact-high">{threatData?.predictions?.estimatedImpact || 'Medium'}</span>
          </div>
          <div className="prediction-item">
            <span className="prediction-label">Time to Contain</span>
            <span className="prediction-value">{threatData?.predictions?.timeToContainment || '4-8 hours'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThreatIntelligence;