# Backend Documentation

## Overview

The SOC backend is a Node.js/Express application that provides AI-powered security incident analysis, multi-tenant support, real-time agent processing, and integration with Microsoft Sentinel. The system is provider-agnostic and supports multiple AI providers including OpenAI, Google Gemini, Anthropic Claude, and custom LLM endpoints.

## Architecture

### Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **AI Integration**: Multi-provider support (OpenAI, Gemini, Anthropic, Custom)
- **Email Service**: SendGrid
- **Authentication**: Azure AD integration
- **Real-time**: Server-Sent Events (SSE)
- **Security**: Microsoft Sentinel integration
- **Configuration**: Environment variables with dotenv

### Project Structure
```
backend/
├── server.js                    # Main application server
├── package.json                 # Dependencies and scripts
├── .env                        # Environment configuration
├── services/                   # Core business logic
│   ├── aiService.js           # Provider-agnostic AI service
│   ├── geminiService.js       # Legacy Gemini-specific service
│   ├── sentinelService.js     # Microsoft Sentinel integration
│   ├── emailTemplateService.js # Email template generation
│   ├── mailService.js         # SendGrid email service
│   ├── eventStream.js         # Server-sent events handler
│   ├── tenantService.js       # Multi-tenant management
│   ├── azureAuthService.js    # Azure authentication
│   └── agentInstructions.js   # AI agent prompt definitions
├── utils/
│   └── promptBuilder.js       # Dynamic prompt construction
├── config/
│   ├── prompts.js            # Prompt templates
│   └── tenants.json          # Tenant configurations
├── logs/                     # Application logs
│   ├── app.log
│   ├── error.log
│   ├── exceptions.log
│   └── rejections.log
└── docs/                     # Documentation
    ├── AI_PROVIDER_GUIDE.md
    ├── AI_WORKFLOW_GUIDE.md
    └── PROMPT_CONSOLIDATION.md
```

## Core Services

### 1. AI Service (`services/aiService.js`)

**Purpose**: Provider-agnostic AI service that routes requests to different LLM providers.

**Supported Providers**:
- **Gemini**: Google's Generative AI
- **OpenAI**: Including Azure OpenAI deployments
- **Anthropic**: Claude models
- **Custom**: Any OpenAI-compatible API

**Key Functions**:
```javascript
async callAI(agentName, promptData, options = {})
// Routes AI requests based on AI_PROVIDER environment variable

async callGemini(prompt, options)
// Google Gemini API integration

async callOpenAI(prompt, options)
// OpenAI/Azure OpenAI API integration

async callAnthropic(prompt, options)
// Anthropic Claude API integration

async callCustomLLM(prompt, options)
// Custom LLM endpoint integration
```

**Configuration**:
```javascript
const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    endpoint: process.env.GEMINI_ENDPOINT,
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    type: 'gemini'
  },
  openai: {
    name: 'OpenAI',
    endpoint: process.env.OPENAI_BASE_URL,
    apiKeyEnv: 'OPENAI_API_KEY',
    deploymentEnv: 'OPENAI_DEPLOYMENT',
    type: 'openai'
  },
  // ... other providers
};
```

### 2. Sentinel Service (`services/sentinelService.js`)

**Purpose**: Microsoft Sentinel integration for incident management and updates.

**Features**:
- Multi-tenant Sentinel workspace support
- Incident status updates
- Comment posting
- Connection validation
- Error handling and retry logic

**Key Functions**:
```javascript
async updateSentinelIncident(incidentData, rcaReport, tenantKey)
// Updates Sentinel incident with analysis results

async validateSentinelConnection(tenantKey)
// Validates connection to Sentinel workspace

async postCommentToSentinel(incidentId, comment, tenantKey)
// Adds comments to Sentinel incidents

async getSentinelIncident(incidentId, tenantKey)
// Retrieves incident details from Sentinel
```

**Authentication**:
- Azure AD service principal authentication
- Per-tenant credential management
- Token caching and refresh

### 3. Email Service (`services/mailService.js` & `services/emailTemplateService.js`)

**Purpose**: Automated email notifications with professional templates.

**Features**:
- SendGrid integration
- HTML email templates
- RCA report email generation
- Acknowledgement emails
- Multi-tenant email routing

**Key Functions**:
```javascript
// mailService.js
async mailSender(to, subject, htmlContent, attachments = [])
// Sends emails via SendGrid

// emailTemplateService.js
function generateOutlookHtmlFromRCA(rcaData, incidentData)
// Generates professional HTML email from RCA data

function generateAcknowledgementEmailHtml(incidentData)
// Creates acknowledgement email template
```

**Email Templates**:
- Executive summary format
- Severity assessment display
- Action items and recommendations
- Technical details appendix
- Corporate branding integration

### 4. Tenant Service (`services/tenantService.js`)

**Purpose**: Multi-tenant configuration and management.

**Features**:
- Tenant configuration loading
- Subscription ID mapping
- ARM resource ID parsing
- Tenant-specific settings

**Key Functions**:
```javascript
function listTenants()
// Returns all configured tenants

function getTenantByKey(tenantKey)
// Retrieves tenant by key identifier

function getTenantBySubscriptionId(subscriptionId)
// Finds tenant by Azure subscription ID

function extractSubscriptionIdFromArmId(armId)
// Parses subscription ID from ARM resource ID
```

**Tenant Configuration**:
```json
{
  "tenants": [
    {
      "key": "TENANT_A",
      "displayName": "Production Environment",
      "subscriptionId": "12345678-1234-1234-1234-123456789abc",
      "resourceGroup": "security-rg",
      "workspaceName": "security-workspace",
      "ownerName": "Security Team",
      "sentinelConfig": {
        "clientId": "azure-client-id",
        "clientSecret": "azure-client-secret",
        "tenantId": "azure-tenant-id"
      }
    }
  ]
}
```

### 5. Event Stream Service (`services/eventStream.js`)

**Purpose**: Real-time updates via Server-Sent Events (SSE).

**Features**:
- Live agent processing updates
- Multi-client broadcasting
- Stage-based progress tracking
- Error event handling

**Key Functions**:
```javascript
function sseHandler(req, res)
// Handles SSE connection establishment

function emitStage(stage, data)
// Broadcasts stage updates to all connected clients

function broadcastToClients(eventData)
// Sends data to all active SSE connections
```

**Event Types**:
- `stage`: Agent processing stage updates
- `error`: Error notifications
- `complete`: Processing completion
- `heartbeat`: Connection keep-alive

### 6. Azure Auth Service (`services/azureAuthService.js`)

**Purpose**: Azure AD authentication and token management.

**Features**:
- Service principal authentication
- Token acquisition and refresh
- Multi-tenant support
- Error handling and retry logic

**Key Functions**:
```javascript
async getAccessToken(tenantConfig)
// Acquires Azure AD access token

async refreshToken(refreshToken, tenantConfig)
// Refreshes expired tokens

function validateTokenExpiry(token)
// Checks token validity
```

## API Endpoints

### Health and Status

#### GET `/health`
**Purpose**: Application health check and configuration status.

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

#### POST `/analyse`
**Purpose**: Analyzes security incidents using AI and generates comprehensive reports.

**Request Body**:
```json
{
  "incidentId": "INC-001",
  "title": "Suspicious Login Activity",
  "description": "Multiple failed login attempts detected",
  "severity": "High",
  "timestamp": "2024-01-15T10:00:00Z",
  "entities": [...],
  "alerts": [...],
  "tenant": {
    "subscriptionId": "12345678-1234-1234-1234-123456789abc"
  }
}
```

**Response**:
```json
{
  "executiveSummary": "...",
  "severityAssessment": {
    "initialSeverity": "High",
    "aiAssessedSeverity": "Medium",
    "justification": "..."
  },
  "verdict": "True Positive",
  "recommendedActions": [...],
  "timelineOfEvents": [...],
  "sentinelAssignment": {
    "success": true,
    "assignedTo": "analyst@company.com",
    "incidentId": "INC-001"
  }
}
```

#### GET `/incidents`
**Purpose**: Retrieves all stored incidents.

**Response**:
```json
[
  {
    "id": "INC-001",
    "title": "Suspicious Login Activity",
    "severity": "High",
    "status": "Active",
    "timestamp": "2024-01-15T10:00:00Z",
    "tenant": {...}
  }
]
```

### Multi-tenant Support

#### GET `/tenants`
**Purpose**: Returns configured tenant list.

**Response**:
```json
[
  {
    "key": "TENANT_A",
    "displayName": "Production Environment",
    "subscriptionId": "12345678-1234-1234-1234-123456789abc",
    "ownerName": "Security Team"
  }
]
```

### Real-time Updates

#### GET `/agent/stream`
**Purpose**: Server-Sent Events endpoint for real-time agent updates.

**Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Format**:
```
data: {"stage": "ANALYZING", "incident": "INC-001", "progress": 25}

data: {"stage": "GENERATING_REPORT", "incident": "INC-001", "progress": 75}

data: {"stage": "COMPLETE", "incident": "INC-001", "progress": 100}
```

### AI Chat

#### POST `/chat`
**Purpose**: Interactive AI chat for incident analysis and general queries.

**Request Body**:
```json
{
  "message": "Analyze this incident for potential threats",
  "mode": "incident",
  "incident": {...},
  "history": [...]
}
```

**Response**:
```json
{
  "response": "Based on the incident data, I can see...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Email Services

#### POST `/send-rca-email`
**Purpose**: Sends RCA report via email.

**Request Body**:
```json
{
  "to": "stakeholder@company.com",
  "incidentData": {...},
  "rcaReport": {...}
}
```

## Environment Configuration

### Required Variables

#### AI Provider Configuration
```env
# Primary AI provider selection
AI_PROVIDER=openai  # Options: gemini, openai, anthropic, custom

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1/
OPENAI_DEPLOYMENT=gpt-4  # For Azure OpenAI

# Google Gemini Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
GEMINI_MODEL=gemini-2.0-flash

# Anthropic Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_ENDPOINT=https://api.anthropic.com/v1/messages
ANTHROPIC_MODEL=claude-3-opus-20240229

# Custom LLM Configuration
CUSTOM_LLM_NAME=My Custom LLM
CUSTOM_LLM_ENDPOINT=https://your-llm-api.com/v1/chat/completions
CUSTOM_LLM_API_KEY=your-api-key
CUSTOM_LLM_MODEL=your-model-name
CUSTOM_LLM_TYPE=openai  # API compatibility type
```

#### Service Configuration
```env
# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourcompany.com

# Server Configuration
PORT=3002
NODE_ENV=production

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Optional Variables
```env
# Development
DEBUG=true
VERBOSE_LOGGING=true

# Performance
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30000
```

## AI Agent System

### Agent Types

#### RCA_ANALYST
**Purpose**: Root Cause Analysis generation
**Input**: Incident data, alerts, entities
**Output**: Comprehensive RCA report

#### EMAIL_VERIFIER
**Purpose**: Email content validation and enhancement
**Input**: Generated email content
**Output**: Verified and improved email

#### CHAT_ASSISTANT
**Purpose**: Interactive incident analysis
**Input**: User questions, incident context
**Output**: Contextual responses and analysis

#### THREAT_ANALYZER
**Purpose**: Threat intelligence and similarity analysis
**Input**: Incident indicators, threat feeds
**Output**: Threat assessment and IOC analysis

### Prompt System

#### Dynamic Prompt Building
```javascript
// utils/promptBuilder.js
export function buildPrompt(agentName, data) {
  const basePrompt = getAgentInstructions(agentName);
  const contextData = formatContextData(data);
  return `${basePrompt}\n\nContext:\n${contextData}`;
}
```

#### Prompt Templates
- System instructions for each agent type
- Context-aware data injection
- Output format specifications
- Error handling instructions

## Security Implementation

### Authentication & Authorization
- Azure AD integration for Sentinel access
- API key management for external services
- Multi-tenant isolation
- Role-based access control (planned)

### Data Protection
- Input sanitization and validation
- Secure credential storage
- Audit logging
- PII detection and masking

### Network Security
- CORS configuration
- Rate limiting (planned)
- HTTPS enforcement
- API key rotation support

## Error Handling

### Error Categories
1. **AI Provider Errors**: API failures, rate limits, invalid responses
2. **Sentinel Integration Errors**: Authentication, API failures, network issues
3. **Email Service Errors**: SendGrid failures, template issues
4. **Validation Errors**: Invalid input data, missing required fields

### Error Response Format
```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "provider": "openai",
    "statusCode": 429,
    "retryAfter": 60
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Logging Strategy
```javascript
// Structured logging with winston
logger.info('AI analysis started', {
  incidentId: 'INC-001',
  provider: 'openai',
  agentType: 'RCA_ANALYST'
});

logger.error('Sentinel update failed', {
  incidentId: 'INC-001',
  tenantKey: 'TENANT_A',
  error: error.message
});
```

## Performance Optimization

### Caching Strategy
- AI response caching for similar incidents
- Tenant configuration caching
- Azure AD token caching

### Async Processing
- Non-blocking AI API calls
- Parallel processing for multiple agents
- Background email sending

### Resource Management
- Connection pooling
- Memory usage monitoring
- CPU usage optimization

## Monitoring & Observability

### Health Checks
- Application health endpoint
- Service dependency checks
- Resource utilization metrics

### Logging
- Structured JSON logging
- Log levels: error, warn, info, debug
- Log rotation and archival
- Centralized log aggregation (planned)

### Metrics (Planned)
- Request/response times
- AI provider response times
- Error rates by service
- Throughput metrics

## Deployment

### Development Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Production Deployment
```bash
# Install production dependencies
npm ci --production

# Start production server
npm start

# Using PM2 (recommended)
pm2 start server.js --name "soc-backend"
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### Environment Requirements
- Node.js 18+
- NPM 8+
- Memory: 512MB minimum, 2GB recommended
- Disk: 1GB for logs and temporary files

## Testing

### Unit Tests
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:coverage # Coverage report
```

### Integration Tests
```bash
npm run test:integration  # API endpoint tests
npm run test:ai          # AI provider tests
npm run test:sentinel    # Sentinel integration tests
```

### Load Testing
```bash
npm run test:load        # Performance testing
```

## Troubleshooting

### Common Issues

#### AI Provider Connection Issues
1. Verify API keys are correct
2. Check endpoint URLs
3. Validate model names
4. Monitor rate limits

#### Sentinel Integration Problems
1. Check Azure AD credentials
2. Verify tenant configuration
3. Test network connectivity
4. Review permission scopes

#### Email Service Issues
1. Validate SendGrid API key
2. Check sender reputation
3. Review email templates
4. Monitor delivery rates

### Debug Tools
```bash
# Enable debug logging
DEBUG=* npm start

# Verbose AI logging
VERBOSE_LOGGING=true npm start

# Test specific components
node test-openai.js
node test-sentinel.js
node test-email.js
```

## API Rate Limits

### Provider Limits
- **OpenAI**: 3,500 requests/minute
- **Gemini**: 60 requests/minute
- **Anthropic**: 1,000 requests/minute
- **SendGrid**: 100 emails/hour (free tier)

### Rate Limit Handling
- Exponential backoff retry
- Queue management
- Priority-based processing
- Graceful degradation

## Future Enhancements

### Planned Features
- WebSocket support for real-time updates
- Advanced caching with Redis
- Machine learning model integration
- Advanced analytics and reporting
- Mobile API endpoints

### Scalability Improvements
- Microservices architecture
- Load balancing
- Database integration
- Kubernetes deployment
- Auto-scaling capabilities

## Contributing

### Development Guidelines
- ESLint configuration for code quality
- Prettier for code formatting
- Conventional commits
- Branch naming conventions
- Pull request templates

### Code Review Process
1. Feature branch creation
2. Implementation with tests
3. Code review and approval
4. Integration testing
5. Deployment to staging
6. Production deployment
