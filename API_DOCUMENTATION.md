# API Documentation

## Overview

The SOC API provides comprehensive endpoints for security incident management, AI-powered analysis, multi-tenant support, and real-time updates. The API follows RESTful principles and supports JSON data exchange.

## Base URL

```
http://localhost:3002
```

## Authentication

Currently, the API uses API key authentication for external services. Future versions will implement JWT-based authentication for client applications.

### Headers
```http
Content-Type: application/json
Accept: application/json
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation details"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Endpoints

### Health & Status

#### GET /health
**Description**: Application health check and system status.

**Response**:
```json
{
  "ok": true,
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptimeSec": 3600,
  "pid": 12345,
  "env": {
    "aiProvider": "openai",
    "hasGeminiKey": true,
    "hasOpenAIKey": true,
    "hasSendgridKey": true,
    "sseEnabled": true
  },
  "services": {
    "email": true,
    "sentinelConfigured": true
  },
  "latencyMs": 5
}
```

### Incident Management

#### POST /analyse
**Description**: Analyzes a security incident using AI and generates a comprehensive report.

**Request Body**:
```json
{
  "incidentId": "INC-2024-001",
  "title": "Suspicious Login Activity Detected",
  "description": "Multiple failed login attempts from unusual locations",
  "severity": "High",
  "status": "New",
  "timestamp": "2024-01-15T10:00:00Z",
  "entities": [
    {
      "type": "Account",
      "name": "john.doe@company.com",
      "properties": {
        "upnSuffix": "company.com",
        "displayName": "John Doe"
      }
    },
    {
      "type": "IP",
      "name": "192.168.1.100",
      "properties": {
        "location": "Unknown",
        "threatType": "Suspicious"
      }
    }
  ],
  "alerts": [
    {
      "alertDisplayName": "Multiple failed logons",
      "severity": "High",
      "status": "New",
      "timeGenerated": "2024-01-15T09:45:00Z",
      "description": "User account has multiple failed logon attempts",
      "tactics": ["Initial Access", "Credential Access"],
      "techniques": ["T1110", "T1078"]
    }
  ],
  "tenant": {
    "subscriptionId": "12345678-1234-1234-1234-123456789abc",
    "resourceGroup": "security-rg",
    "workspaceName": "security-workspace"
  }
}
```

**Response**:
```json
{
  "executiveSummary": "A high-severity security incident involving suspicious login activity has been detected. The incident shows multiple failed login attempts targeting user account john.doe@company.com from potentially malicious IP addresses. Initial analysis suggests this may be a credential stuffing or brute force attack.",
  
  "severityAssessment": {
    "initialSeverity": "High",
    "aiAssessedSeverity": "Medium",
    "justification": "While the incident shows suspicious login activity, the attacks were unsuccessful and existing security controls prevented unauthorized access. The severity is adjusted to Medium based on the lack of successful compromise.",
    "severityMatch": false
  },
  
  "incidentDetails": {
    "incidentId": "INC-2024-001",
    "classification": "Failed Logon",
    "attackType": "Credential Attack",
    "affectedAssets": ["john.doe@company.com"],
    "sourceIPs": ["192.168.1.100"],
    "timeRange": {
      "start": "2024-01-15T09:30:00Z",
      "end": "2024-01-15T10:00:00Z"
    }
  },
  
  "timelineOfEvents": [
    {
      "timestamp": "2024-01-15T09:30:00Z",
      "source": "Azure AD",
      "eventAction": "Failed Sign-in",
      "notes": "First failed login attempt detected",
      "confidence": "High"
    },
    {
      "timestamp": "2024-01-15T09:45:00Z",
      "source": "Azure AD",
      "eventAction": "Multiple Failed Sign-ins",
      "notes": "Pattern of failed attempts identified",
      "confidence": "High"
    },
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "source": "Sentinel",
      "eventAction": "Alert Generated",
      "notes": "Security alert created for investigation",
      "confidence": "High"
    }
  ],
  
  "detectionDetails": {
    "detectionMethod": "Behavioral Analytics",
    "alertRules": ["Multiple Failed Logons"],
    "confidence": "High",
    "falsePositiveRisk": "Low"
  },
  
  "attackVectorAndTechniques": {
    "primaryVector": "Credential Access",
    "mitreAttackTechniques": [
      {
        "id": "T1110",
        "name": "Brute Force",
        "description": "Adversary attempting to gain access through password guessing"
      }
    ],
    "killChainPhase": "Initial Access"
  },
  
  "rootCauseAnalysis": {
    "primaryCause": "External threat actor attempting credential access",
    "contributingFactors": [
      "Publicly exposed login portal",
      "No rate limiting on failed attempts"
    ],
    "systemWeaknesses": [
      "Lack of geographic access controls",
      "No multi-factor authentication enforcement"
    ]
  },
  
  "impactAssessment": {
    "businessImpact": "Low",
    "dataImpact": "None",
    "systemImpact": "None",
    "affectedUsers": 1,
    "estimatedDowntime": "0 minutes",
    "financialImpact": "Minimal"
  },
  
  "containmentAndRemediation": {
    "immediateActions": [
      "Monitor account for successful logins",
      "Review login patterns for anomalies"
    ],
    "shortTermActions": [
      "Implement account lockout policies",
      "Enable MFA for affected account"
    ],
    "longTermActions": [
      "Deploy conditional access policies",
      "Implement IP-based access controls"
    ]
  },
  
  "verdict": "True Positive - Attempted Credential Attack",
  
  "recommendedActions": {
    "immediate": [
      "Reset password for affected account",
      "Enable MFA if not already configured",
      "Block suspicious IP addresses"
    ],
    "shortTerm": [
      "Review and update password policies",
      "Implement account lockout mechanisms",
      "Deploy geographic access controls"
    ],
    "longTerm": [
      "Implement zero-trust architecture",
      "Deploy advanced threat protection",
      "Regular security awareness training"
    ]
  },
  
  "actionsTaken": [
    "Account monitored for additional suspicious activity",
    "Security team notified of potential threat",
    "Incident logged for trend analysis"
  ],
  
  "preventionMeasures": [
    "Multi-factor authentication deployment",
    "Conditional access policy implementation",
    "Regular security assessments",
    "User education and awareness programs"
  ],
  
  "evidenceAndArtifacts": {
    "logSources": ["Azure AD Sign-in Logs", "Sentinel Analytics"],
    "iocs": [
      {
        "type": "IP",
        "value": "192.168.1.100",
        "confidence": "Medium"
      }
    ],
    "logFieldInterpretation": [
      {
        "fieldName": "ResultType",
        "value": "50126",
        "interpretation": "Invalid username or password",
        "significance": "Indicates failed authentication attempt"
      }
    ]
  },
  
  "sentinelAssignment": {
    "success": true,
    "assignedTo": "analyst@company.com",
    "severity": "Medium",
    "incidentId": "INC-2024-001",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid incident data format
- `500 Internal Server Error`: AI analysis failed
- `503 Service Unavailable`: AI provider unavailable

#### GET /incidents
**Description**: Retrieves all stored incidents.

**Query Parameters**:
- `tenant` (optional): Filter by tenant key
- `severity` (optional): Filter by severity level
- `status` (optional): Filter by incident status
- `limit` (optional): Limit number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
[
  {
    "id": "INC-2024-001",
    "title": "Suspicious Login Activity Detected",
    "severity": "High",
    "aiAssessedSeverity": "Medium",
    "status": "Active",
    "timestamp": "2024-01-15T10:00:00Z",
    "tenant": {
      "key": "TENANT_A",
      "displayName": "Production Environment"
    },
    "assignedTo": "analyst@company.com",
    "tags": ["credential-attack", "failed-login"],
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
]
```

### Multi-tenant Support

#### GET /tenants
**Description**: Returns list of configured tenants.

**Response**:
```json
[
  {
    "key": "TENANT_A",
    "displayName": "Production Environment",
    "subscriptionId": "12345678-1234-1234-1234-123456789abc",
    "resourceGroup": "security-rg",
    "workspaceName": "security-workspace",
    "ownerName": "Security Team",
    "status": "active"
  },
  {
    "key": "TENANT_B",
    "displayName": "Development Environment",
    "subscriptionId": "87654321-4321-4321-4321-210987654321",
    "resourceGroup": "dev-security-rg",
    "workspaceName": "dev-security-workspace",
    "ownerName": "Dev Team",
    "status": "active"
  }
]
```

### AI Chat Interface

#### POST /chat
**Description**: Interactive AI chat for incident analysis and security queries.

**Request Body**:
```json
{
  "message": "Can you analyze this incident for potential lateral movement?",
  "mode": "incident",
  "incident": {
    "incidentId": "INC-2024-001",
    "title": "Suspicious Login Activity",
    "entities": [...],
    "alerts": [...]
  },
  "history": [
    {
      "role": "user",
      "content": "What are the key indicators in this incident?",
      "timestamp": "2024-01-15T10:25:00Z"
    },
    {
      "role": "assistant",
      "content": "The key indicators include multiple failed login attempts...",
      "timestamp": "2024-01-15T10:25:30Z"
    }
  ],
  "context": {
    "allIncidents": [...],
    "userRole": "analyst"
  }
}
```

**Response**:
```json
{
  "response": "Based on the incident data provided, I can analyze the potential for lateral movement:\n\n1. **Current Evidence**: The incident shows failed login attempts, which indicates the attacker has not yet gained initial access to the environment.\n\n2. **Lateral Movement Risk**: Since the login attempts were unsuccessful, there is currently no evidence of lateral movement. However, if the attacker were to succeed, they could potentially:\n   - Enumerate domain resources\n   - Attempt privilege escalation\n   - Move to other systems using the compromised credentials\n\n3. **Recommendations**: \n   - Monitor for any successful logins from the same source IPs\n   - Check for unusual network traffic patterns\n   - Review access logs for the targeted account\n   - Implement network segmentation to limit potential lateral movement",
  "timestamp": "2024-01-15T10:30:00Z",
  "confidence": "high",
  "sources": ["incident_data", "mitre_attack", "best_practices"]
}
```

**Chat Modes**:
- `general`: General security assistance
- `incident`: Incident-specific analysis
- `threat_intel`: Threat intelligence queries

### Real-time Updates

#### GET /agent/stream
**Description**: Server-Sent Events endpoint for real-time agent processing updates.

**Headers**:
```http
Accept: text/event-stream
Cache-Control: no-cache
```

**Event Stream Format**:
```
event: stage
data: {"stage": "ANALYZING", "incident": "INC-2024-001", "progress": 25, "message": "Analyzing incident data..."}

event: stage
data: {"stage": "THREAT_ASSESSMENT", "incident": "INC-2024-001", "progress": 50, "message": "Performing threat assessment..."}

event: stage
data: {"stage": "GENERATING_REPORT", "incident": "INC-2024-001", "progress": 75, "message": "Generating comprehensive report..."}

event: complete
data: {"stage": "COMPLETE", "incident": "INC-2024-001", "progress": 100, "message": "Analysis complete", "reportId": "RPT-2024-001"}

event: error
data: {"stage": "ERROR", "incident": "INC-2024-001", "error": "AI provider timeout", "retryable": true}

event: heartbeat
data: {"timestamp": "2024-01-15T10:30:00Z", "activeConnections": 5}
```

**Event Types**:
- `stage`: Processing stage updates
- `complete`: Analysis completion
- `error`: Error notifications
- `heartbeat`: Connection keep-alive (every 30 seconds)

### Email Services

#### POST /send-rca-email
**Description**: Sends RCA report via email to stakeholders.

**Request Body**:
```json
{
  "to": ["stakeholder@company.com", "manager@company.com"],
  "cc": ["security-team@company.com"],
  "incidentData": {
    "incidentId": "INC-2024-001",
    "title": "Suspicious Login Activity",
    "severity": "High"
  },
  "rcaReport": {
    "executiveSummary": "...",
    "recommendedActions": [...],
    "verdict": "True Positive"
  },
  "template": "executive",
  "priority": "high"
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "msg_abc123def456",
  "recipients": [
    {
      "email": "stakeholder@company.com",
      "status": "sent"
    },
    {
      "email": "manager@company.com",
      "status": "sent"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /send-acknowledgement
**Description**: Sends incident acknowledgement email.

**Request Body**:
```json
{
  "to": "reporter@company.com",
  "incidentData": {
    "incidentId": "INC-2024-001",
    "title": "Suspicious Login Activity",
    "reportedBy": "John Doe",
    "assignedTo": "analyst@company.com"
  },
  "estimatedResolution": "2024-01-15T14:00:00Z"
}
```

### Sentinel Integration

#### POST /sentinel/update-incident
**Description**: Updates incident in Microsoft Sentinel.

**Request Body**:
```json
{
  "incidentId": "INC-2024-001",
  "tenantKey": "TENANT_A",
  "updates": {
    "severity": "Medium",
    "status": "Active",
    "assignedTo": "analyst@company.com",
    "classification": "True Positive",
    "comment": "AI analysis completed. Incident classified as credential attack attempt."
  }
}
```

**Response**:
```json
{
  "success": true,
  "sentinelIncidentId": "12345678-1234-1234-1234-123456789abc",
  "updatedFields": ["severity", "status", "assignedTo", "classification"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /sentinel/validate-connection/:tenantKey
**Description**: Validates connection to Sentinel workspace.

**Response**:
```json
{
  "connected": true,
  "workspace": "security-workspace",
  "subscriptionId": "12345678-1234-1234-1234-123456789abc",
  "lastChecked": "2024-01-15T10:30:00Z",
  "permissions": [
    "Microsoft.SecurityInsights/incidents/read",
    "Microsoft.SecurityInsights/incidents/write"
  ]
}
```

## Error Codes

### Client Errors (4xx)
- `400 INVALID_REQUEST`: Malformed request body or parameters
- `401 UNAUTHORIZED`: Missing or invalid authentication
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT_FOUND`: Resource not found
- `409 CONFLICT`: Resource conflict (e.g., duplicate incident)
- `422 VALIDATION_ERROR`: Request validation failed
- `429 RATE_LIMITED`: Too many requests

### Server Errors (5xx)
- `500 INTERNAL_ERROR`: General server error
- `502 AI_PROVIDER_ERROR`: AI service unavailable
- `503 SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `504 TIMEOUT`: Request timeout
- `507 STORAGE_ERROR`: Storage system error

## Rate Limiting

### Current Limits
- **General API**: 1000 requests/hour per IP
- **Analysis Endpoint**: 10 requests/minute per IP
- **Chat Endpoint**: 60 requests/hour per IP
- **Email Endpoints**: 100 emails/day per tenant

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
X-RateLimit-RetryAfter: 3600
```

## Webhooks (Planned)

### Incident Status Updates
**URL**: Configurable per tenant
**Method**: POST
**Payload**:
```json
{
  "event": "incident.status_changed",
  "incidentId": "INC-2024-001",
  "oldStatus": "New",
  "newStatus": "In Progress",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant": "TENANT_A"
}
```

### Analysis Completion
**URL**: Configurable per tenant
**Method**: POST
**Payload**:
```json
{
  "event": "analysis.completed",
  "incidentId": "INC-2024-001",
  "reportId": "RPT-2024-001",
  "verdict": "True Positive",
  "severity": "Medium",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant": "TENANT_A"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

class SOCClient {
  constructor(baseURL = 'http://localhost:3002') {
    this.client = axios.create({ baseURL });
  }

  async analyzeIncident(incidentData) {
    const response = await this.client.post('/analyse', incidentData);
    return response.data;
  }

  async getIncidents(filters = {}) {
    const response = await this.client.get('/incidents', { params: filters });
    return response.data;
  }

  async chatWithAI(message, mode = 'general', context = {}) {
    const response = await this.client.post('/chat', {
      message,
      mode,
      ...context
    });
    return response.data;
  }
}

// Usage
const soc = new SOCClient();
const analysis = await soc.analyzeIncident(incidentData);
console.log(analysis.verdict);
```

### Python
```python
import requests
import json

class SOCClient:
    def __init__(self, base_url="http://localhost:3002"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def analyze_incident(self, incident_data):
        response = self.session.post(
            f"{self.base_url}/analyse",
            json=incident_data
        )
        response.raise_for_status()
        return response.json()

    def get_incidents(self, **filters):
        response = self.session.get(
            f"{self.base_url}/incidents",
            params=filters
        )
        response.raise_for_status()
        return response.json()

    def chat_with_ai(self, message, mode="general", **context):
        payload = {
            "message": message,
            "mode": mode,
            **context
        }
        response = self.session.post(
            f"{self.base_url}/chat",
            json=payload
        )
        response.raise_for_status()
        return response.json()

# Usage
soc = SOCClient()
analysis = soc.analyze_incident(incident_data)
print(analysis['verdict'])
```

## Testing

### Health Check
```bash
curl -X GET http://localhost:3002/health
```

### Analyze Incident
```bash
curl -X POST http://localhost:3002/analyse \
  -H "Content-Type: application/json" \
  -d @incident-sample.json
```

### Get Incidents
```bash
curl -X GET "http://localhost:3002/incidents?tenant=TENANT_A&severity=High"
```

### Chat with AI
```bash
curl -X POST http://localhost:3002/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the common indicators of a phishing attack?",
    "mode": "general"
  }'
```

## Changelog

### v1.0.0 (Current)
- Initial API release
- Multi-provider AI support
- Sentinel integration
- Real-time SSE updates
- Multi-tenant support

### Planned v1.1.0
- Webhook support
- Advanced filtering
- Bulk operations
- API versioning
- Enhanced authentication
