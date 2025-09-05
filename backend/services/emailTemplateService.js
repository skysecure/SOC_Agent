import axios from 'axios';

function normalizeRCA(o) {
  // Intelligent value extraction function
  const extractValue = (value, context = '') => {
    if (value == null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      // If array of strings, join them
      if (typeof value[0] === 'string') return value.join(', ');
      // If array of objects, extract meaningful data
      if (typeof value[0] === 'object') {
        return value.map(item => {
          // Look for common descriptive properties
          const descriptiveKeys = ['description', 'name', 'title', 'value', 'summary', 'text', 'message', 'action', 'task'];
          for (const key of descriptiveKeys) {
            if (item[key] && typeof item[key] === 'string') return item[key];
          }
          // Try to find any string property
          for (const [k, v] of Object.entries(item)) {
            if (typeof v === 'string' && v.trim()) return v;
          }
          // For MITRE mapping or similar
          if (item.tactic && item.technique) {
            return `${item.tactic}: ${item.technique}`;
          }
          return '';
        }).filter(s => s).join(', ');
      }
      return value.join(', ');
    }
    
    // Handle objects
    if (typeof value === 'object') {
      // Check for common patterns
      const valuePaths = [
        'summary', 'description', 'value', 'name', 'title', 'text', 'message',
        'primaryDetection', 'accessVector', 'effectiveness', 'correlation',
        'primaryCause', 'impact', 'details', 'content', 'data'
      ];
      
      for (const path of valuePaths) {
        if (value[path]) {
          const extracted = extractValue(value[path]);
          if (extracted && extracted !== '[object Object]') return extracted;
        }
      }
      
      // Try to extract first meaningful string
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string' && v.trim() && v !== 'N/A') return v;
      }
      
      // Recursively try nested objects (one level)
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'object' && !Array.isArray(v)) {
          const nested = extractValue(v, k);
          if (nested && nested !== '[object Object]' && nested !== '') return nested;
        }
      }
      
      return ''; // Return empty instead of [object Object]
    }
    
    return String(value);
  };
  
  const s = extractValue;
  const a = (v) => (Array.isArray(v) ? v : []);
  
  return {
    executiveSummary: s(o?.executiveSummary),
    incidentDetails: {
      id: s(o?.incidentDetails?.id),
      owner: s(o?.incidentDetails?.owner),
      openedUTC: s(o?.incidentDetails?.openedUTC),
      status: s(o?.incidentDetails?.status),
      detectionSource: s(o?.incidentDetails?.detectionSource),
      analyticsRuleName: s(o?.incidentDetails?.analyticsRuleName),
      environment: s(o?.incidentDetails?.environment),
      affectedService: s(o?.incidentDetails?.affectedService),
      typeOfIncident: s(o?.incidentDetails?.typeOfIncident)
    },
    severityAssessment: {
      initialSeverity: s(o?.severityAssessment?.initialSeverity),
      aiAssessedSeverity: s(o?.severityAssessment?.aiAssessedSeverity),
      justification: s(o?.severityAssessment?.justification)
    },
    timelineOfEvents: a(o?.timelineOfEvents),
    rootCauseAnalysis: {
      primaryCause: s(o?.rootCauseAnalysis?.primaryCause),
      contributingFactors: a(o?.rootCauseAnalysis?.contributingFactors),
      controlFailureAnalysis: o?.rootCauseAnalysis?.controlFailureAnalysis || {},
      vulnerabilityTimeline: s(o?.rootCauseAnalysis?.vulnerabilityTimeline),
      previousIncidents: s(o?.rootCauseAnalysis?.previousIncidents),
      riskAcceptance: s(o?.rootCauseAnalysis?.riskAcceptance)
    },
    impactAssessment: o?.impactAssessment || {
      systemsImpact: {}, userImpact: {}, dataImpact: {}, businessImpact: {}, complianceImpact: {}, attackDuration: ''
    },
    containmentAndRemediation: o?.containmentAndRemediation || {},
    recommendedActions: {
      immediate: a(o?.recommendedActions?.immediate),
      shortTerm: a(o?.recommendedActions?.shortTerm),
      longTerm: a(o?.recommendedActions?.longTerm)
    },
    evidenceAndArtifacts: {
      iocs: a(o?.evidenceAndArtifacts?.iocs),
      logFieldInterpretation: a(o?.evidenceAndArtifacts?.logFieldInterpretation),
      entityAppendices: o?.evidenceAndArtifacts?.entityAppendices || { ipAddresses: [], urls: [], domains: [] }
    },
    additionalDataRequirements: o?.additionalDataRequirements || {},
    // Enhanced fields with intelligent extraction
    attackVectorAndTechniques: {
      accessVector: s(o?.attackVectorAndTechniques?.accessVector),
      mitreMapping: a(o?.attackVectorAndTechniques?.mitreMapping),
      sophistication: s(o?.attackVectorAndTechniques?.sophistication),
      evasion: s(o?.attackVectorAndTechniques?.evasion),
      tools: a(o?.attackVectorAndTechniques?.tools)
    },
    detectionDetails: {
      primaryDetection: s(o?.detectionDetails?.primaryDetection),
      effectiveness: s(o?.detectionDetails?.effectiveness),
      sourceAnalysis: s(o?.detectionDetails?.sourceAnalysis),
      correlation: s(o?.detectionDetails?.correlation)
    },
    verdict: s(o?.verdict),
    verdictRationale: s(o?.verdictRationale),
    preventionMeasures: a(o?.preventionMeasures),
    actionsTaken: o?.actionsTaken || {}
  };
}

function deterministicHtml(raw) {
  const rca = normalizeRCA(raw);
  const td = 'style="border:1px solid #d0d7de;padding:6px;vertical-align:top;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124"';
  const th = 'style="border:1px solid #d0d7de;padding:6px;background:#f6f8fa;text-align:left;font-weight:600;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124"';
  const h2 = 'style="margin:16px 0 8px 0;color:#1a73e8;font-family:Segoe UI,Arial,sans-serif;font-size:16px"';
  const p = 'style="margin:0 0 8px 0;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124;line-height:1.35"';
  const safe = (v) => {
    if (v == null || v === '') return '';
    // Never return N/A - return empty string instead
    return String(v);
  };
  
  // Check if a value has meaningful content
  const hasContent = (v) => v && v !== '' && v !== 'N/A' && v !== '[]' && v !== '{}';
  const wrap = (inner) => `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #d0d7de;width:100%;table-layout:fixed">${inner}</table>`;
  const kv = (k, v) => `<tr><td ${th}>${k}</td><td ${td}>${safe(v)}</td></tr>`;

  const timelineRows = rca.timelineOfEvents.length
    ? rca.timelineOfEvents.map(e => `<tr><td ${td}>${safe(e.timestamp)}</td><td ${td}>${safe(e.source)}</td><td ${td}>${safe(e.eventAction)}</td><td ${td}>${safe(e.notes)}</td><td ${td}>${safe(e.confidence)}</td></tr>`).join('')
    : '';

  const iocRows = rca.evidenceAndArtifacts.iocs.length
    ? rca.evidenceAndArtifacts.iocs.map(i => `<tr><td ${td}>${safe(i.indicatorType || i.type)}</td><td ${td}>${safe(i.indicatorValue || i.value)}</td><td ${td}>${safe(i.description)}</td><td ${td}>${safe(i.confidence)}</td></tr>`).join('')
    : '';

  return `
<div style="max-width:700px;margin:0 auto">
  <h2 ${h2}>Incident Overview</h2>
  ${wrap(`
    <tr><th ${th}>Field</th><th ${th}>Value</th></tr>
    ${kv('Incident ID', rca.incidentDetails.id)}
    ${kv('Owner', rca.incidentDetails.owner)}
    ${kv('Opened (UTC)', rca.incidentDetails.openedUTC)}
    ${kv('Status', rca.incidentDetails.status)}
    ${kv('Detection Source', rca.incidentDetails.detectionSource)}
    ${kv('Analytics Rule', rca.incidentDetails.analyticsRuleName)}
    ${kv('Environment', rca.incidentDetails.environment)}
    ${kv('Affected Service', rca.incidentDetails.affectedService)}
    ${kv('Type of Incident', rca.incidentDetails.typeOfIncident)}
    ${kv('Initial Severity', rca.severityAssessment.initialSeverity)}
    ${kv('AI-Assessed Severity', rca.severityAssessment.aiAssessedSeverity)}
  `)}
  <br>

  <h2 ${h2}>Security Relevance</h2>
  ${wrap(`
    <tr><th ${th}>Attack Vector</th><td ${td}>${safe(rca.attackVectorAndTechniques?.accessVector) || 'Analysis pending'}</td></tr>
    <tr><th ${th}>MITRE Techniques</th><td ${td}>${rca.attackVectorAndTechniques?.mitreMapping?.length ? rca.attackVectorAndTechniques.mitreMapping.map(m => typeof m === 'string' ? m : `${m.tactic}: ${m.technique}`).join(', ') : 'Not mapped'}</td></tr>
    <tr><th ${th}>Sophistication Level</th><td ${td}>${safe(rca.attackVectorAndTechniques?.sophistication) || 'Under assessment'}</td></tr>
    <tr><th ${th}>Evasion Techniques</th><td ${td}>${safe(rca.attackVectorAndTechniques?.evasion) || 'None detected'}</td></tr>
    <tr><th ${th}>Security Risk</th><td ${td}>${safe(rca.severityAssessment?.justification) || 'See severity assessment'}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Findings and Investigation</h2>
  ${wrap(`
    <tr><th ${th} colspan="2" style="background:#e8f0fe">Detection and Investigation Summary</th></tr>
    <tr><th ${th}>Primary Detection</th><td ${td}>${safe(rca.detectionDetails?.primaryDetection) || 'See detection source above'}</td></tr>
    <tr><th ${th}>Detection Effectiveness</th><td ${td}>${safe(rca.detectionDetails?.effectiveness) || 'Detected as configured'}</td></tr>
    <tr><th ${th}>Investigation Sources</th><td ${td}>${safe(rca.detectionDetails?.sourceAnalysis) || 'Standard investigation protocols'}</td></tr>
    <tr><th ${th}>Key Finding</th><td ${td}>${safe(rca.rootCauseAnalysis?.primaryCause) || 'Under investigation'}</td></tr>
    <tr><th ${th}>IOCs Identified</th><td ${td}>${rca.evidenceAndArtifacts?.iocs?.length || 0} indicators found</td></tr>
  `)}
  <br>

  ${timelineRows ? `
  <h2 ${h2}>Timeline</h2>
  ${wrap(`
    <tr><th ${th}>Timestamp (UTC)</th><th ${th}>Source</th><th ${th}>Event/Action</th><th ${th}>Notes</th><th ${th}>Confidence</th></tr>
    ${timelineRows}
  `)}
  <br>` : ''}

  <h2 ${h2}>Root Cause</h2>
  ${wrap(`
    <tr><th ${th}>Primary Cause</th><td ${td}>${safe(rca.rootCauseAnalysis.primaryCause)}</td></tr>
    <tr><th ${th}>Contributing Factors</th><td ${td}>${rca.rootCauseAnalysis.contributingFactors.length ? rca.rootCauseAnalysis.contributingFactors.map(f => typeof f === 'string' ? f : (f.factor || f.description || extractValue(f))).filter(f => f).join(', ') : 'No contributing factors identified'}</td></tr>
    <tr><th ${th}>Control Failures</th><td ${td}>${safe(rca.rootCauseAnalysis.controlFailureAnalysis?.summary) || 'Security control gap analysis in progress'}</td></tr>
    <tr><th ${th}>Vulnerability Timeline</th><td ${td}>${safe(rca.rootCauseAnalysis.vulnerabilityTimeline)}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Impact</h2>
  ${wrap(`
    <tr><th ${th}>Systems Impact</th><td ${td}>${safe(rca.impactAssessment.systemsImpact?.summary || rca.impactAssessment.systems) || 'Analyzing system-level impact based on incident type'}</td></tr>
    <tr><th ${th}>User Impact</th><td ${td}>${safe(rca.impactAssessment.userImpact?.summary || rca.impactAssessment.users) || 'Assessing user exposure and access implications'}</td></tr>
    <tr><th ${th}>Data Impact</th><td ${td}>${safe(rca.impactAssessment.dataImpact?.summary || rca.impactAssessment.data) || 'Evaluating data integrity and confidentiality risks'}</td></tr>
    <tr><th ${th}>Business Impact</th><td ${td}>${safe(rca.impactAssessment.businessImpact?.summary) || 'Determining business process disruption potential'}</td></tr>
    <tr><th ${th}>Compliance Impact</th><td ${td}>${safe(rca.impactAssessment.complianceImpact?.summary) || 'Reviewing regulatory compliance implications'}</td></tr>
    <tr><th ${th}>Attack Duration</th><td ${td}>${safe(rca.impactAssessment.attackDuration)}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Containment & Remediation</h2>
  ${wrap(`
    <tr><th ${th}>Actions Taken</th><td ${td}>${(rca.containmentAndRemediation.immediate?.length ? rca.containmentAndRemediation.immediate : []).concat(rca.actionsTaken?.containment ? [rca.actionsTaken.containment] : []).filter(a => a).join('; ') || 'Containment measures in progress'}</td></tr>
    <tr><th ${th}>Eradication Steps</th><td ${td}>${rca.containmentAndRemediation.eradication?.join('; ') || safe(rca.actionsTaken?.eradication) || 'Pending investigation completion'}</td></tr>
    <tr><th ${th}>Recovery Process</th><td ${td}>${rca.containmentAndRemediation.recovery?.join('; ') || safe(rca.actionsTaken?.recovery) || 'To be determined after containment'}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Recommended Next Steps</h2>
  ${wrap(`
    <tr><th ${th}>Priority</th><th ${th}>Action Required</th></tr>
    ${[...rca.recommendedActions.immediate, ...rca.recommendedActions.shortTerm, ...rca.recommendedActions.longTerm]
      .filter(action => action)
      .map((action, index) => `<tr><td ${td} style="text-align:center;font-weight:600">${index + 1}</td><td ${td}>${action}</td></tr>`)
      .join('')
    }
  `)}
  <br>

  ${iocRows ? `
  <h2 ${h2}>Evidence & Artifacts</h2>
  ${wrap(`
    <tr><th ${th}>Type</th><th ${th}>Value</th><th ${th}>Notes</th><th ${th}>Confidence</th></tr>
    ${iocRows}
  `)}
  <br>` : ''}

  ${hasContent(rca.additionalDataRequirements?.summary) ? `
  <h2 ${h2}>Additional Data Requirements</h2>
  <div ${p}>${safe(rca.additionalDataRequirements.summary)}</div>
  <br>` : ''}

  <h2 ${h2}>Conclusion</h2>
  <div ${p}>
    ${rca.verdict ? `<strong>${rca.verdict}.</strong>` : ''}
    ${rca.severityAssessment.aiAssessedSeverity ? ` Risk level assessed as <span style="color:${rca.severityAssessment.aiAssessedSeverity === 'high' ? '#d32f2f' : rca.severityAssessment.aiAssessedSeverity === 'medium' ? '#f57c00' : '#388e3c'};font-weight:600">${rca.severityAssessment.aiAssessedSeverity.toUpperCase()}</span>${rca.severityAssessment.justification ? ` due to ${rca.severityAssessment.justification.toLowerCase()}.` : '.'}` : ''}
    ${rca.recommendedActions.immediate.length > 0 ? ` Immediate action required: ${rca.recommendedActions.immediate[0]}.` : ''}
  </div>
</div>
  `.trim();
}

export async function generateOutlookHtmlFromRCA(rca) {
  const normalized = normalizeRCA(rca);
  
  try {
    // First generate the initial HTML
    console.log('[TEMPLATE] Generating initial HTML');
    let html = deterministicHtml(normalized);
    
    // Apply verification agent to enhance the report
    try {
      console.log('[TEMPLATE] Running verification agent');
      const { verifyAndFixEmailReport } = await import('./emailVerificationAgent.js');
      const verifiedHtml = await verifyAndFixEmailReport(html, rca);
      // Only use verified HTML if it contains all expected sections
      if (verifiedHtml.includes('Security Relevance') && verifiedHtml.includes('Findings and Investigation')) {
        html = verifiedHtml;
        console.log('[TEMPLATE] Verification completed successfully');
      } else {
        console.log('[TEMPLATE] Verification returned incomplete report, using original');
      }
    } catch (verifyError) {
      console.error('[TEMPLATE] Verification failed, using initial HTML:', verifyError.message);
    }
    
    return html;
  } catch (error) {
    console.error('[TEMPLATE] Failed to generate email:', error);
    // Last resort fallback
    return '<div style="max-width:700px;margin:0 auto"><h2>Error</h2><p>Failed to generate email report. Please check the logs.</p></div>';
  }
}

export async function generateAcknowledgementEmailHtml(context) {
  try {
    const ackData = {
      incidentTitle: context?.incidentTitle,
      incidentId: context?.incidentId,
      timestampUtc: context?.timestampUtc,
      requestId: context?.requestId,
      orgName: context?.orgName || 'Security Operations Center',
      contactEmail: context?.contactEmail || '',
    };

    const baseHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Incident Acknowledgement</title>
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="format-detection" content="telephone=no,email=no,address=no,date=no,url=no">
  <meta name="x-apple-disable-message-reformatting">
  <style>html,body{margin:0;padding:0}</style>
  <!-- Inline CSS only; no external assets -->
  <!-- Simple, Outlook-safe layout -->
</head>
<body style="margin:0;padding:0;background:#f6f8fb">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f8fb">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width:700px;width:100%;background:#ffffff;border:1px solid #e5eaf0;border-radius:6px">
          <tr>
            <td style="padding:0">
              <div style="height:6px;background:#1a73e8;border-radius:6px 6px 0 0"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 8px 24px;font-family:Segoe UI,Arial,sans-serif">
              <div style="font-size:18px;font-weight:600;color:#202124">${ackData.orgName}</div>
              <div style="font-size:12px;color:#5f6368;margin-top:2px">Incident Acknowledgement</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 0 24px;font-family:Segoe UI,Arial,sans-serif">
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#202124">
                We confirm receipt of the incident and have initiated investigation.
              </p>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:#5f6368">
                We will provide updates as they become available.
              </p>
            </td>
          </tr>
          ${(ackData.incidentTitle || ackData.incidentId || ackData.timestampUtc || ackData.requestId) ? `
          <tr>
            <td style="padding:8px 24px 16px 24px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5eaf0">
                <tr>
                  <td style="background:#f6f8fa;border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124;font-weight:600;width:40%">Incident Title</td>
                  <td style="border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124">${ackData.incidentTitle || ''}</td>
                </tr>
                ${ackData.incidentId ? `
                <tr>
                  <td style="background:#f6f8fa;border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124;font-weight:600">Incident ID</td>
                  <td style="border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124">${ackData.incidentId}</td>
                </tr>` : ''}
                ${ackData.timestampUtc ? `
                <tr>
                  <td style="background:#f6f8fa;border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124;font-weight:600">Timestamp (UTC)</td>
                  <td style="border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124">${ackData.timestampUtc}</td>
                </tr>` : ''}
                ${ackData.requestId ? `
                <tr>
                  <td style="background:#f6f8fa;border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124;font-weight:600">Request ID</td>
                  <td style="border:1px solid #e5eaf0;padding:8px 10px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124">${ackData.requestId}</td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:8px 24px 24px 24px;font-family:Segoe UI,Arial,sans-serif">
              ${ackData.contactEmail ? `<div style="font-size:12px;color:#5f6368;margin-bottom:8px">Contact: <a href="mailto:${ackData.contactEmail}" style="color:#1a73e8;text-decoration:none">${ackData.contactEmail}</a></div>` : ''}
              <div style="font-size:11px;color:#9aa0a6;line-height:1.4">This message and any attachments are intended solely for the named recipient and may contain confidential information. If you are not the intended recipient, please notify the sender and delete this message.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <div style="display:none;white-space:nowrap;font:15px courier;line-height:0">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  <!-- End -->
  
</body>
</html>`;

    try {
      const { verifyAndEnhanceAckEmail } = await import('./emailVerificationAgent.js');
      const enhanced = await verifyAndEnhanceAckEmail(baseHtml, ackData);
      return enhanced;
    } catch (e) {
      console.error('[TEMPLATE] Ack verification failed, using base HTML');
      return baseHtml;
    }
  } catch (error) {
    console.error('[TEMPLATE] Failed to generate acknowledgement email:', error);
    return '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px">Incident acknowledged.</div>';
  }
}


