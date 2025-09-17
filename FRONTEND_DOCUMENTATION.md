# Frontend Documentation

## Overview

The SOC (Security Operations Center) frontend is a React-based web application that provides a comprehensive dashboard for security incident management, analysis, and reporting. The application features an enterprise-grade UI with real-time updates, AI-powered analysis, and multi-tenant support.

## Architecture

### Tech Stack
- **Framework**: React 18.x
- **Router**: React Router DOM
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Styling**: CSS3 with CSS Variables
- **Date Handling**: date-fns
- **Build Tool**: Create React App

### Project Structure
```
frontend/src/
├── App.js                 # Main application entry point
├── Dashboard.js           # Primary dashboard component
├── index.js              # React app initialization
├── components/           # Reusable components
│   ├── AIChatPanel.js    # AI chat interface
│   ├── CustomDropdown.js # Multi-tenant selector
│   ├── LiveAgentFeed.js  # Real-time agent updates
│   ├── ReportDisplay.js  # Incident report viewer
│   └── ThreatIntelligence.js # Threat analysis display
├── styles/              # CSS files
│   ├── App.css
│   ├── Dashboard.css
│   ├── index.css
│   └── components/
│       ├── AIChatPanel.css
│       ├── CustomDropdown.css
│       ├── LiveAgentFeed.css
│       ├── ReportDisplay.css
│       └── ThreatIntelligence.css
└── public/
    └── index.html
```

## Components Documentation

### 1. App Component (`App.js`)

**Purpose**: Primary incident analysis interface for manual incident submission.

**Features**:
- JSON incident data input
- Real-time analysis processing
- Report generation and display
- Error handling and validation

**Key Functions**:
```javascript
handleSubmit(e) // Processes incident data and sends to backend
```

**State Management**:
- `incidentData`: Raw JSON input from user
- `report`: Generated analysis report
- `loading`: Processing state
- `error`: Error messages

**API Integration**:
- `POST /analyse` - Submit incident for analysis

### 2. Dashboard Component (`Dashboard.js`)

**Purpose**: Main operational dashboard for SOC analysts.

**Features**:
- Multi-tenant incident management
- Real-time metrics and charts
- Quick incident analysis
- Live agent feed integration
- AI chat assistance
- Threat intelligence display

**Key Functions**:
```javascript
fetchIncidents()          // Retrieves incident list
fetchTenants()           // Loads tenant configuration
handleIncidentClick()    // Opens incident details
handleQuickLook()        // Shows incident preview
showAIAnalysis()         // Triggers AI analysis
```

**State Management**:
- `incidents`: Array of security incidents
- `selectedTenantKey`: Current tenant filter
- `selectedIncident`: Currently viewed incident
- `quickLookIncident`: Preview incident data
- `showAIChat`: AI chat panel visibility
- `showThreatIntel`: Threat intelligence panel state

**Metrics Calculated**:
- Total incidents count
- Severity distribution (High/Medium/Low/Informational)
- Status overview (Active/Closed)
- Initial vs AI-assessed severity comparison
- Average response time

**Charts & Visualizations**:
- Line chart: Incident trends over time
- Bar chart: Severity distribution comparison
- Bar chart: Status overview
- Real-time metrics cards

### 3. ReportDisplay Component (`components/ReportDisplay.js`)

**Purpose**: Renders comprehensive incident analysis reports with enterprise UI.

**Features**:
- Bubble/pill navigation tabs
- Collapsible report sections
- Executive summary display
- Severity assessment comparison
- Timeline visualization
- Evidence and artifacts display
- Verdict and recommendations
- JSON data renderer

**Key Functions**:
```javascript
JsonRenderer({data, depth}) // Recursively renders JSON data
getSeverityClass(level)     // Returns CSS class for severity
chipLabel(key)              // Generates navigation labels with counts
```

**Navigation System**:
- Pill-style section navigation
- Scroll-to-section functionality
- Active section highlighting
- Critical vs All sections toggle

**Report Sections**:
1. Executive Summary
2. Severity Assessment
3. Sentinel Assignment
4. Incident Details
5. Timeline of Events
6. Detection Details
7. Attack Vector and Techniques
8. Root Cause Analysis
9. Impact Assessment
10. Containment and Remediation
11. Verdict
12. Actions Taken
13. Recommended Actions
14. Prevention Measures
15. Evidence and Artifacts

### 4. AIChatPanel Component (`components/AIChatPanel.js`)

**Purpose**: Interactive AI assistant for incident analysis and general queries.

**Features**:
- Context-aware chat interface
- Incident-specific analysis
- General security queries
- Real-time message streaming
- Chat history management

**Chat Modes**:
- `general`: General security assistance
- `incident`: Incident-specific analysis

**Key Functions**:
```javascript
handleSendMessage()      // Sends user message to AI
handleKeyPress()         // Keyboard shortcuts
scrollToBottom()         // Auto-scroll to latest message
```

### 5. LiveAgentFeed Component (`components/LiveAgentFeed.js`)

**Purpose**: Real-time display of AI agent processing stages and events.

**Features**:
- Live agent pipeline updates
- Stage-by-stage progress tracking
- Event logging and timestamps
- Multi-tenant filtering
- Auto-refresh capabilities

**Agent Stages**:
- Data Ingestion
- Initial Analysis
- Threat Assessment
- Evidence Collection
- Report Generation
- Sentinel Integration

**Key Functions**:
```javascript
getStageIcon(state)         // Returns appropriate icon for stage
formatIncidentNumber(value) // Formats incident identifiers
```

### 6. ThreatIntelligence Component (`components/ThreatIntelligence.js`)

**Purpose**: Displays threat intelligence and similarity analysis for incidents.

**Features**:
- Threat score visualization
- Similar incident matching
- Attack technique mapping
- IOC (Indicators of Compromise) display
- Threat actor profiling

**Key Functions**:
```javascript
// Threat analysis and visualization functions
```

### 7. CustomDropdown Component (`components/CustomDropdown.js`)

**Purpose**: Enterprise-styled dropdown for tenant selection.

**Features**:
- Professional enterprise styling
- Keyboard navigation
- Search/filter capabilities
- Multi-tenant support

## Styling System

### Design Principles
- **Enterprise Professional**: Clean, minimal, business-appropriate
- **Consistency**: Unified color palette and typography
- **Accessibility**: High contrast, readable fonts
- **Responsiveness**: Mobile-first design approach

### Color Palette
```css
/* Primary Colors */
--primary-blue: #2563eb;
--primary-dark: #1a2332;
--primary-gray: #6b7280;

/* Background Colors */
--bg-white: #ffffff;
--bg-light: #f8f9fa;
--bg-gray: #f3f4f6;

/* Border Colors */
--border-light: #e5e7eb;
--border-medium: #d1d5db;
--border-dark: #9ca3af;

/* Severity Colors */
--severity-critical: #dc2626;
--severity-high: #d97706;
--severity-medium: #65a30d;
--severity-low: #0891b2;
```

### Typography
```css
/* Font Stack */
font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

/* Font Sizes */
--text-xs: 0.625rem;    /* 10px */
--text-sm: 0.6875rem;   /* 11px */
--text-base: 0.75rem;   /* 12px */
--text-lg: 0.875rem;    /* 14px */
```

### Component Styling Standards

#### Buttons
- Pill-style with `border-radius: 16px`
- Subtle hover effects with `transform: translateY(-1px)`
- Consistent padding: `0.375rem 0.875rem`

#### Cards
- Flat design with `border-radius: 0`
- Subtle borders: `1px solid #e5e7eb`
- No shadows for enterprise look

#### Tables
- Sticky headers for long data sets
- Alternating row colors
- Hover effects for row highlighting
- Compact spacing for data density

## API Integration

### Base Configuration
```javascript
const IP = process.env.IP || "localhost";
const PORT = process.env.PORT || "3002";
```

### Endpoints Used

#### GET Endpoints
- `/health` - Application health check
- `/incidents` - Fetch all incidents
- `/tenants` - Get tenant configuration
- `/agent/stream` - Server-sent events for live updates

#### POST Endpoints
- `/analyse` - Submit incident for AI analysis
- `/chat` - Send chat messages to AI assistant

### Error Handling
- Network error detection
- Server response validation
- User-friendly error messages
- Graceful degradation

## State Management

### Component-Level State
Each component manages its own state using React hooks:
- `useState` for local component state
- `useEffect` for side effects and API calls
- `useMemo` for expensive computations
- `useRef` for DOM references

### Data Flow
```
User Input → Component State → API Call → Backend Processing → Response → State Update → UI Update
```

## Performance Optimizations

### React Optimizations
- `useMemo` for expensive calculations
- Conditional rendering to minimize DOM updates
- Debounced API calls for search/filter operations

### UI Optimizations
- CSS transitions instead of JavaScript animations
- Efficient chart rendering with Recharts
- Lazy loading for large data sets
- Virtual scrolling for long lists

### Network Optimizations
- Axios interceptors for request/response handling
- Error retry mechanisms
- Request caching where appropriate

## Build and Deployment

### Development
```bash
npm start          # Start development server
npm run build      # Create production build
npm test           # Run test suite
npm run lint       # Code linting
```

### Production Build
- Optimized bundle size
- Code splitting
- Asset compression
- Source map generation

### Environment Variables
```env
REACT_APP_API_URL=http://localhost:3002
REACT_APP_WS_URL=ws://localhost:3002
```

## Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills
- ES6+ features via Create React App
- CSS Grid and Flexbox support
- Modern JavaScript APIs

## Security Considerations

### Data Handling
- Sensitive data sanitization
- XSS prevention
- CSRF protection via axios defaults

### Authentication
- JWT token handling (when implemented)
- Secure session management
- Role-based access control

## Testing Strategy

### Unit Tests
- Component rendering tests
- Function logic tests
- State management tests

### Integration Tests
- API integration tests
- Component interaction tests
- End-to-end workflow tests

### Testing Tools
- Jest for unit testing
- React Testing Library for component tests
- Cypress for E2E testing (planned)

## Accessibility

### WCAG Compliance
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Color contrast compliance

### Screen Reader Support
- Descriptive alt text
- Proper heading hierarchy
- Focus management

## Future Enhancements

### Planned Features
- Real-time WebSocket integration
- Advanced filtering and search
- Export functionality
- Mobile app development
- Offline capability

### Performance Improvements
- Code splitting optimization
- Bundle size reduction
- Caching strategies
- Progressive Web App features

## Troubleshooting

### Common Issues
1. **API Connection Errors**: Check backend server status and CORS configuration
2. **Chart Rendering Issues**: Verify Recharts version compatibility
3. **Styling Problems**: Check CSS specificity and browser compatibility
4. **State Updates**: Ensure proper React state management patterns

### Debug Tools
- React Developer Tools
- Browser Network tab
- Console logging
- Performance profiler

## Contributing

### Code Standards
- ESLint configuration
- Prettier formatting
- Component naming conventions
- CSS organization principles

### Pull Request Process
1. Feature branch creation
2. Code implementation
3. Testing and validation
4. Code review
5. Merge and deployment
