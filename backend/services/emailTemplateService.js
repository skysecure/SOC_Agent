import axios from 'axios';

function normalizeRCA(o) {
  const s = (v) => (v == null ? '' : String(v));
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
    additionalDataRequirements: o?.additionalDataRequirements || {}
  };
}

function deterministicHtml(raw) {
  const rca = normalizeRCA(raw);
  const td = 'style="border:1px solid #d0d7de;padding:6px;vertical-align:top;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124"';
  const th = 'style="border:1px solid #d0d7de;padding:6px;background:#f6f8fa;text-align:left;font-weight:600;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124"';
  const h2 = 'style="margin:16px 0 8px 0;color:#1a73e8;font-family:Segoe UI,Arial,sans-serif;font-size:16px"';
  const p = 'style="margin:0 0 8px 0;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#202124;line-height:1.35"';
  const safe = (v) => (v == null || v === '' ? 'N/A' : String(v));
  const wrap = (inner) => `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #d0d7de;width:100%;table-layout:fixed">${inner}</table>`;
  const kv = (k, v) => `<tr><td ${th}>${k}</td><td ${td}>${safe(v)}</td></tr>`;

  const timelineRows = (rca.timelineOfEvents.length
    ? rca.timelineOfEvents.map(e => `<tr><td ${td}>${safe(e.timestamp)}</td><td ${td}>${safe(e.source)}</td><td ${td}>${safe(e.eventAction)}</td><td ${td}>${safe(e.notes)}</td><td ${td}>${safe(e.confidence)}</td></tr>`).join('')
    : `<tr><td ${td} colspan="5">N/A</td></tr>`);

  const iocRows = (rca.evidenceAndArtifacts.iocs.length
    ? rca.evidenceAndArtifacts.iocs.map(i => `<tr><td ${td}>${safe(i.indicatorType || i.type)}</td><td ${td}>${safe(i.indicatorValue || i.value)}</td><td ${td}>${safe(i.description)}</td><td ${td}>${safe(i.confidence)}</td></tr>`).join('')
    : `<tr><td ${td} colspan="4">N/A</td></tr>`);

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
  <div ${p}><strong>Executive Summary:</strong><br>${safe(rca.executiveSummary)}</div>

  <h2 ${h2}>Timeline</h2>
  ${wrap(`
    <tr><th ${th}>Timestamp (UTC)</th><th ${th}>Source</th><th ${th}>Event/Action</th><th ${th}>Notes</th><th ${th}>Confidence</th></tr>
    ${timelineRows}
  `)}
  <br>

  <h2 ${h2}>Root Cause</h2>
  ${wrap(`
    <tr><th ${th}>Primary Cause</th><td ${td}>${safe(rca.rootCauseAnalysis.primaryCause)}</td></tr>
    <tr><th ${th}>Contributing Factors</th><td ${td}>${rca.rootCauseAnalysis.contributingFactors.length ? rca.rootCauseAnalysis.contributingFactors.join(', ') : 'N/A'}</td></tr>
    <tr><th ${th}>Control Failures</th><td ${td}>${safe(rca.rootCauseAnalysis.controlFailureAnalysis?.summary)}</td></tr>
    <tr><th ${th}>Vulnerability Timeline</th><td ${td}>${safe(rca.rootCauseAnalysis.vulnerabilityTimeline)}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Impact</h2>
  ${wrap(`
    <tr><th ${th}>Systems Impact</th><td ${td}>${safe(rca.impactAssessment.systemsImpact?.summary || rca.impactAssessment.systems)}</td></tr>
    <tr><th ${th}>User Impact</th><td ${td}>${safe(rca.impactAssessment.userImpact?.summary || rca.impactAssessment.users)}</td></tr>
    <tr><th ${th}>Data Impact</th><td ${td}>${safe(rca.impactAssessment.dataImpact?.summary || rca.impactAssessment.data)}</td></tr>
    <tr><th ${th}>Business Impact</th><td ${td}>${safe(rca.impactAssessment.businessImpact?.summary)}</td></tr>
    <tr><th ${th}>Compliance Impact</th><td ${td}>${safe(rca.impactAssessment.complianceImpact?.summary)}</td></tr>
    <tr><th ${th}>Attack Duration</th><td ${td}>${safe(rca.impactAssessment.attackDuration)}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Containment & Remediation</h2>
  ${wrap(`
    <tr><th ${th}>Immediate</th><td ${td}>${rca.containmentAndRemediation.immediate?.length ? rca.containmentAndRemediation.immediate.join(', ') : 'N/A'}</td></tr>
    <tr><th ${th}>Short Term</th><td ${td}>${rca.recommendedActions.shortTerm.length ? rca.recommendedActions.shortTerm.join(', ') : 'N/A'}</td></tr>
    <tr><th ${th}>Long Term</th><td ${td}>${rca.recommendedActions.longTerm.length ? rca.recommendedActions.longTerm.join(', ') : 'N/A'}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Recommendations</h2>
  ${wrap(`
    <tr><th ${th}>Immediate</th><td ${td}>${rca.recommendedActions.immediate.length ? rca.recommendedActions.immediate.join(', ') : 'N/A'}</td></tr>
    <tr><th ${th}>Short Term</th><td ${td}>${rca.recommendedActions.shortTerm.length ? rca.recommendedActions.shortTerm.join(', ') : 'N/A'}</td></tr>
    <tr><th ${th}>Long Term</th><td ${td}>${rca.recommendedActions.longTerm.length ? rca.recommendedActions.longTerm.join(', ') : 'N/A'}</td></tr>
  `)}
  <br>

  <h2 ${h2}>Evidence & Artifacts</h2>
  ${wrap(`
    <tr><th ${th}>Type</th><th ${th}>Value</th><th ${th}>Notes</th><th ${th}>Confidence</th></tr>
    ${iocRows}
  `)}
  <br>

  <h2 ${h2}>Additional Data Requirements</h2>
  <div ${p}>${safe(rca.additionalDataRequirements?.summary)}</div>
</div>
  `.trim();
}

export async function generateOutlookHtmlFromRCA(rca) {
  const normalized = normalizeRCA(rca);
  const prompt = `
You are formatting a security incident RCA into an Outlook-safe HTML email.
- Wrap in <div style="max-width:700px;margin:0 auto">…</div>
- Inline CSS only; simple <h2> headers (#1a73e8, ~16px); basic tables with borders/padding; no merged/nested tables; <br> for spacing; font Segoe UI/Arial.
Sections (in order): Overview, Timeline, Root Cause, Impact, Containment & Remediation, Recommendations, Evidence & Artifacts, Additional Data.
Input:
${JSON.stringify(normalized, null, 2)}
Output: ONLY raw HTML.`;
  try {
    console.log('[TEMPLATE] Requesting Gemini HTML generation');
    const r = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2800 } },
      { headers: { 'Content-Type': 'application/json', 'X-goog-api-key': process.env.GEMINI_API_KEY } }
    );
    const text = r?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[TEMPLATE] Gemini response length', text.length);
    const html = text.match(/```html\s*([\s\S]*?)```/i)?.[1] || (text.trim().startsWith('<') ? text.trim() : null);
    if (html && html.includes('<div') && html.includes('</div>')) {
      console.log('[TEMPLATE] Using Gemini-generated HTML');
      return html.trim();
    }
    console.log('[TEMPLATE] Falling back to deterministic HTML');
    return deterministicHtml(normalized);
  } catch (e) {
    console.error('[TEMPLATE] Gemini generation failed; using fallback', e?.message);
    return deterministicHtml(normalized);
  }
}


