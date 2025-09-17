# System Architecture Documentation

## Overview

The SOC (Security Operations Center) system is a comprehensive, AI-powered security incident management platform designed for enterprise environments. The architecture follows a modern microservices approach with clear separation of concerns, multi-tenant support, and provider-agnostic AI integration.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 SOC System                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   Frontend      │    │    Backend      │    │   External      │        │
│  │   (React)       │◄──►│   (Node.js)     │◄──►│   Services      │        │
│  │                 │    │                 │    │                 │        │
│  │  • Dashboard    │    │  • AI Service   │    │  • OpenAI       │        │
│  │  • Reports      │    │  • Sentinel     │    │  • Gemini       │        │
│  │  • Chat         │    │  • Email        │    │  • Anthropic    │        │
│  │  • Live Feed    │    │  • Tenants      │    │  • Sentinel     │        │
│  │                 │    │  • Auth         │    │  • SendGrid     │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React SPA)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Dashboard   │  │ App         │  │ Components  │  │ Services    │       │
│  │             │  │             │  │             │  │             │       │
│  │ • Metrics   │  │ • Routing   │  │ • Report    │  │ • API       │       │
│  │ • Charts    │  │ • State     │  │ • Chat      │  │ • WebSocket │       │
│  │ • Tables    │  │ • Layout    │  │ • Feed      │  │ • Storage   │       │
│  │ • Filters   │  │             │  │ • Dropdown  │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        State Management                             │   │
│  │                                                                     │   │
│  │  • Component State (useState, useEffect)                           │   │
│  │  • Shared State (Context API)                                      │   │
│  │  • API State (Axios + Local State)                                 │   │
│  │  • Real-time State (Server-Sent Events)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Backend (Node.js/Express)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   API Layer     │    │  Service Layer  │    │  Integration    │        │
│  │                 │    │                 │    │     Layer       │        │
│  │ • REST Routes   │◄──►│ • AI Service    │◄──►│ • AI Providers  │        │
│  │ • SSE Endpoint  │    │ • Sentinel Svc  │    │ • Sentinel API  │        │
│  │ • Middleware    │    │ • Email Service │    │ • SendGrid      │        │
│  │ • Error Handler │    │ • Tenant Svc    │    │ • Azure AD      │        │
│  │ • Validation    │    │ • Auth Service  │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Utilities & Config                           │   │
│  │                                                                     │   │
│  │  • Prompt Builder    • Logging         • Environment Config        │   │
│  │  • Agent Instructions • Error Handling  • Security Utils           │   │
│  │  • Data Validation   • Rate Limiting    • Health Checks            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### Incident Analysis Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Backend   │    │ AI Provider │    │  Sentinel   │
│  (Frontend) │    │  (Express)  │    │ (OpenAI/etc)│    │   (Azure)   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. Submit        │                  │                  │
       │ Incident Data    │                  │                  │
       ├─────────────────►│                  │                  │
       │                  │ 2. Validate &    │                  │
       │                  │ Process Data     │                  │
       │                  │                  │                  │
       │                  │ 3. Send to AI    │                  │
       │                  │ for Analysis     │                  │
       │                  ├─────────────────►│                  │
       │                  │                  │ 4. Generate      │
       │                  │                  │ Analysis Report  │
       │                  │◄─────────────────┤                  │
       │                  │                  │                  │
       │                  │ 5. Update        │                  │
       │                  │ Sentinel         │                  │
       │                  ├─────────────────────────────────────►│
       │                  │                  │                  │ 6. Update
       │                  │                  │                  │ Incident
       │                  │◄─────────────────────────────────────┤
       │                  │                  │                  │
       │ 7. Return        │                  │                  │
       │ Complete Report  │                  │                  │
       │◄─────────────────┤                  │                  │
       │                  │                  │                  │
```

### Real-time Updates Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Backend   │    │ Processing  │
│  (Browser)  │    │    (SSE)    │    │   Agents    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. Connect to    │                  │
       │ SSE Stream       │                  │
       ├─────────────────►│                  │
       │                  │                  │
       │                  │◄─────────────────┤ 2. Agent Stage
       │                  │ Stage Update     │ Updates
       │                  │                  │
       │ 3. Broadcast     │                  │
       │ to Client        │                  │
       │◄─────────────────┤                  │
       │                  │                  │
       │ 4. Update UI     │                  │
       │ in Real-time     │                  │
       │                  │                  │
```

## Component Architecture

### AI Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI Service Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Provider Abstraction                             │   │
│  │                                                                     │   │
│  │    callAI(agentName, promptData, options) → AI Response            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   OpenAI    │  │   Gemini    │  │ Anthropic   │  │   Custom    │       │
│  │ Integration │  │ Integration │  │ Integration │  │    LLM      │       │
│  │             │  │             │  │             │  │ Integration │       │
│  │ • GPT-4     │  │ • Gemini    │  │ • Claude    │  │ • Any API   │       │
│  │ • Azure     │  │ • Flash     │  │ • Opus      │  │ • OpenAI    │       │
│  │ • Custom    │  │ • Pro       │  │ • Sonnet    │  │   Compatible│       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Agent Types                                 │   │
│  │                                                                     │   │
│  │  • RCA_ANALYST        • EMAIL_VERIFIER     • CHAT_ASSISTANT        │   │
│  │  • THREAT_ANALYZER    • SEVERITY_ASSESSOR  • VERDICT_GENERATOR      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multi-tenant Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Multi-tenant System                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Tenant Configuration                           │   │
│  │                                                                     │   │
│  │    tenants.json → Tenant Service → Runtime Configuration           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Tenant A   │  │  Tenant B   │  │  Tenant C   │  │  Tenant D   │       │
│  │             │  │             │  │             │  │             │       │
│  │ • Prod Env  │  │ • Dev Env   │  │ • Test Env  │  │ • DR Env    │       │
│  │ • Sentinel  │  │ • Sentinel  │  │ • Sentinel  │  │ • Sentinel  │       │
│  │ • Azure AD  │  │ • Azure AD  │  │ • Azure AD  │  │ • Azure AD  │       │
│  │ • SendGrid  │  │ • SendGrid  │  │ • SendGrid  │  │ • SendGrid  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Data Isolation                                 │   │
│  │                                                                     │   │
│  │  • Tenant-specific configurations                                  │   │
│  │  • Isolated Sentinel workspaces                                    │   │
│  │  • Separate Azure AD tenants                                       │   │
│  │  • Tenant-filtered data access                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication & Authorization Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Backend   │    │  Azure AD   │    │  Sentinel   │
│             │    │             │    │             │    │ Workspace   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. Request with  │                  │                  │
       │ Tenant Context   │                  │                  │
       ├─────────────────►│                  │                  │
       │                  │ 2. Get Tenant    │                  │
       │                  │ Configuration    │                  │
       │                  │                  │                  │
       │                  │ 3. Request       │                  │
       │                  │ Access Token     │                  │
       │                  ├─────────────────►│                  │
       │                  │                  │ 4. Validate      │
       │                  │                  │ Credentials      │
       │                  │◄─────────────────┤                  │
       │                  │ 5. Access Token  │                  │
       │                  │                  │                  │
       │                  │ 6. API Call with │                  │
       │                  │ Bearer Token     │                  │
       │                  ├─────────────────────────────────────►│
       │                  │                  │                  │
       │ 7. Authorized    │                  │                  │
       │ Response         │                  │                  │
       │◄─────────────────┤                  │                  │
       │                  │                  │                  │
```

### Data Security Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Security Layers                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Transport Security                             │   │
│  │                                                                     │   │
│  │  • HTTPS/TLS 1.3      • Certificate Validation                     │   │
│  │  • Secure Headers     • CORS Configuration                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Application Security                              │   │
│  │                                                                     │   │
│  │  • Input Validation   • Output Sanitization                        │   │
│  │  • SQL Injection      • XSS Prevention                             │   │
│  │  • CSRF Protection    • Rate Limiting                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Data Security                                   │   │
│  │                                                                     │   │
│  │  • Encryption at Rest • Encryption in Transit                      │   │
│  │  • PII Detection      • Data Masking                               │   │
│  │  • Audit Logging      • Data Retention                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  Infrastructure Security                            │   │
│  │                                                                     │   │
│  │  • Network Segmentation • Firewall Rules                           │   │
│  │  • Container Security   • Secret Management                        │   │
│  │  • Access Controls      • Monitoring & Alerting                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Development Environment                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   Developer     │    │     Local       │    │    External     │        │
│  │   Machine       │    │   Services      │    │    Services     │        │
│  │                 │    │                 │    │                 │        │
│  │ • VS Code       │◄──►│ • Node.js       │◄──►│ • OpenAI API    │        │
│  │ • React Dev     │    │ • Express       │    │ • Gemini API    │        │
│  │ • Hot Reload    │    │ • File System   │    │ • SendGrid      │        │
│  │ • Debug Tools   │    │ • Local Storage │    │ • Azure AD      │        │
│  │                 │    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Development Tools                              │   │
│  │                                                                     │   │
│  │  • npm/yarn           • ESLint/Prettier    • Jest Testing          │   │
│  │  • Nodemon            • React DevTools     • Postman/Insomnia      │   │
│  │  • dotenv             • Source Maps        • Browser DevTools      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Production Environment                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  Load Balancer  │    │   Application   │    │    Database     │        │
│  │   (Nginx/ALB)   │    │    Servers      │    │   (Planned)     │        │
│  │                 │    │                 │    │                 │        │
│  │ • SSL Term      │◄──►│ • Node.js       │◄──►│ • PostgreSQL    │        │
│  │ • Rate Limiting │    │ • PM2 Cluster   │    │ • Redis Cache   │        │
│  │ • Health Checks │    │ • Auto Scaling  │    │ • Replication   │        │
│  │ • Monitoring    │    │ • Log Shipping  │    │ • Backups       │        │
│  │                 │    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    External Services                                │   │
│  │                                                                     │   │
│  │  • AI Providers       • Microsoft Sentinel  • SendGrid            │   │
│  │  • Azure AD           • CDN (CloudFlare)     • Monitoring          │   │
│  │  • DNS Services       • Log Aggregation      • Alerting           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Container Architecture (Planned)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Container Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   Frontend      │    │    Backend      │    │     Cache       │        │
│  │   Container     │    │   Container     │    │   Container     │        │
│  │                 │    │                 │    │                 │        │
│  │ • Nginx         │    │ • Node.js       │    │ • Redis         │        │
│  │ • React Build   │    │ • Express App   │    │ • Session Store │        │
│  │ • Static Assets │    │ • Health Check  │    │ • Cache Layer   │        │
│  │ • GZIP          │    │ • Graceful Stop │    │ • Pub/Sub       │        │
│  │                 │    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Orchestration (Kubernetes)                       │   │
│  │                                                                     │   │
│  │  • Deployments       • Services           • ConfigMaps             │   │
│  │  • ReplicaSets       • Ingress            • Secrets                │   │
│  │  • Horizontal Scaling • Load Balancing     • Health Probes         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Caching Layers                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Browser Cache                                  │   │
│  │                                                                     │   │
│  │  • Static Assets      • API Responses      • Local Storage         │   │
│  │  • Service Worker     • IndexedDB          • Session Storage       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Application Cache                                │   │
│  │                                                                     │   │
│  │  • In-Memory Cache   • AI Response Cache   • Tenant Config         │   │
│  │  • Node.js Cache     • Authentication      • Rate Limit Cache      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Redis Cache                                    │   │
│  │                                                                     │   │
│  │  • Session Storage   • API Response Cache  • Real-time Data        │   │
│  │  • Queue Management  • Pub/Sub Messages    • Temporary Storage     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CDN Cache                                      │   │
│  │                                                                     │   │
│  │  • Static Assets     • API Responses       • Geographic Dist.      │   │
│  │  • Image Optimization • Edge Computing      • DDoS Protection      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scalability Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Scalability Strategy                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Horizontal Scaling                               │   │
│  │                                                                     │   │
│  │  • Multiple App Instances    • Load Balancing                      │   │
│  │  • Auto Scaling Groups       • Container Orchestration             │   │
│  │  • Microservices Split       • Database Sharding                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Vertical Scaling                               │   │
│  │                                                                     │   │
│  │  • CPU/Memory Upgrade        • SSD Storage                         │   │
│  │  • Network Bandwidth         • Database Optimization               │   │
│  │  • Connection Pooling        • Query Optimization                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Performance Optimization                         │   │
│  │                                                                     │   │
│  │  • Code Splitting            • Lazy Loading                        │   │
│  │  • Bundle Optimization       • Tree Shaking                        │   │
│  │  • Database Indexing         • Query Caching                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Monitoring Architecture

### Observability Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Monitoring & Observability                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │    Metrics      │    │      Logs       │    │     Traces      │        │
│  │  (Prometheus)   │    │  (ELK Stack)    │    │   (Jaeger)      │        │
│  │                 │    │                 │    │                 │        │
│  │ • CPU/Memory    │    │ • Application   │    │ • Request Flow  │        │
│  │ • API Latency   │    │ • Error Logs    │    │ • Service Deps  │        │
│  │ • Request Rate  │    │ • Access Logs   │    │ • Performance   │        │
│  │ • Error Rate    │    │ • Audit Logs    │    │ • Bottlenecks   │        │
│  │                 │    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Alerting & Dashboards                         │   │
│  │                                                                     │   │
│  │  • Grafana Dashboards        • PagerDuty Integration               │   │
│  │  • Alert Manager             • Slack Notifications                 │   │
│  │  • Custom Metrics            • SLA Monitoring                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Integration Architecture

### External Service Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        External Integrations                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ AI Providers│  │ Microsoft   │  │ Email       │  │ Identity    │       │
│  │             │  │ Sentinel    │  │ Services    │  │ Providers   │       │
│  │ • OpenAI    │  │             │  │             │  │             │       │
│  │ • Gemini    │  │ • Incidents │  │ • SendGrid  │  │ • Azure AD  │       │
│  │ • Anthropic │  │ • Workbooks │  │ • SMTP      │  │ • OAuth 2.0 │       │
│  │ • Custom    │  │ • Analytics │  │ • Templates │  │ • SAML      │       │
│  │             │  │ • REST API  │  │ • Tracking  │  │ • JWT       │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Integration Patterns                             │   │
│  │                                                                     │   │
│  │  • REST API Calls           • Webhook Endpoints                    │   │
│  │  • OAuth Authentication     • Event-Driven Updates                 │   │
│  │  • Rate Limit Handling      • Circuit Breaker Pattern             │   │
│  │  • Retry Logic              • Fallback Mechanisms                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Future Architecture Considerations

### Planned Enhancements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Future Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Microservices Migration                          │   │
│  │                                                                     │   │
│  │  • AI Service        • Incident Service     • Notification Service │   │
│  │  • Auth Service      • Tenant Service       • Analytics Service    │   │
│  │  • Gateway Service   • Config Service       • Audit Service        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Event-Driven Architecture                        │   │
│  │                                                                     │   │
│  │  • Event Sourcing    • CQRS Pattern         • Message Queues       │   │
│  │  • Event Store       • Pub/Sub Systems       • Event Replay        │   │
│  │  • Saga Pattern      • Event Streams         • Dead Letter Queue   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Advanced Features                              │   │
│  │                                                                     │   │
│  │  • Machine Learning   • Advanced Analytics   • Mobile Apps         │   │
│  │  • AI Model Training  • Predictive Analysis  • Offline Support     │   │
│  │  • Custom Dashboards • Real-time Streaming   • Edge Computing      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Decisions

### Frontend Technology Stack
- **React**: Component-based UI development with strong ecosystem
- **Recharts**: Professional chart library with enterprise aesthetics
- **Axios**: Robust HTTP client with interceptor support
- **CSS3**: Custom styling for enterprise look and feel
- **date-fns**: Lightweight date manipulation library

### Backend Technology Stack
- **Node.js**: JavaScript runtime for consistent language across stack
- **Express.js**: Minimal web framework with extensive middleware ecosystem
- **dotenv**: Environment configuration management
- **Axios**: HTTP client for external API integration

### Integration Choices
- **Server-Sent Events**: Real-time updates without WebSocket complexity
- **REST API**: Standard HTTP-based API design
- **JSON**: Universal data exchange format
- **Multi-provider AI**: Vendor-agnostic AI integration

## Performance Characteristics

### Expected Performance Metrics
- **API Response Time**: < 200ms for standard operations
- **AI Analysis Time**: 10-30 seconds depending on complexity
- **Concurrent Users**: 100+ simultaneous users
- **Throughput**: 1000+ requests/minute
- **Availability**: 99.9% uptime target

### Scalability Targets
- **Horizontal Scaling**: 10+ application instances
- **Data Volume**: 10,000+ incidents/month
- **Storage Growth**: 1TB+ annual data growth
- **Geographic Distribution**: Multi-region deployment ready

This architecture provides a solid foundation for enterprise security operations with room for future growth and enhancement.
