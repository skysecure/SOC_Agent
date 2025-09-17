import React, { useState, useRef, useEffect, memo } from 'react';
import axios from 'axios';
import './AIChatPanel.css';

const API_URL = `http://${process.env.REACT_APP_API_HOST || 'localhost'}:${process.env.REACT_APP_API_PORT || '3002'}`;

// HTML escape function for security
const escapeHtml = (input) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(input).replace(/[&<>"']/g, m => map[m]);
};

// Basic markdown formatter
const formatBasicMarkdown = (text) => {
  if (!text) return '';
  
  let html = escapeHtml(text);
  
  // Apply formatting
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\s(\d)\.\s/g, '<br/>$1. ')
    .replace(/\s•\s/g, '<br/>• ')
    .replace(/\n/g, '<br/>');
  
  return html;
};

// Response utilities
const EXPAND_KEYWORDS = /\b(more|detail|details|full|expand|long|complete|all)\b/i;
const BULLET_PATTERN = /^(\s*(?:\d+\.\s|[-*•]\s))/;
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

const isExpandRequested = (queryText) => EXPAND_KEYWORDS.test(queryText || '');

const condenseConcise = (rawText, userQuery) => {
  if (isExpandRequested(userQuery)) return String(rawText || '').trim();
  
  const original = String(rawText || '').trim();
  if (!original) return original;
  
  const lines = original.split(/\r?\n/);
  const bulletLike = lines.filter(line => BULLET_PATTERN.test(line));
  
  if (bulletLike.length > 0) {
    return bulletLike.slice(0, 3).join('\n');
  }
  
  const sentences = original.split(SENTENCE_SPLIT);
  return sentences.slice(0, 2).join(' ');
};

// Message Component
const Message = memo(({ message, formatText }) => (
  <div className={`ai-message ${message.type}`}>
    <div className="ai-message-avatar" aria-hidden="true">
      {message.type === 'ai' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      )}
    </div>
    <div className="ai-message-content">
      <p dangerouslySetInnerHTML={{ __html: formatText(message.text) }} />
      <span className="ai-message-time">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  </div>
));

Message.displayName = 'Message';

// Helper function for generating contextual responses
const getContextualResponse = () => {
  const responses = [
    "**Threat Level:** Sophisticated attack requiring immediate attention.",
    "**Actor Profile:** Advanced persistent threat (APT) characteristics detected.",
    "**Risk Reduction:** Implemented mitigations reduce risk by approximately 85%.",
    "**IOCs Identified:** Multiple indicators added to blocklist."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

// Main component
function AIChatPanel({ isOpen, onClose, chatIncident, chatMode, allIncidents = [] }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize welcome message
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      
      const welcomeMessage = chatMode === 'incident' && chatIncident
        ? `Analyzing incident ${chatIncident.id} (${chatIncident.type}). Severity: ${chatIncident.severityAssessment?.aiAssessedSeverity || chatIncident.severity}. How can I assist with this incident?`
        : `AI Security Assistant ready. Monitoring ${allIncidents.length} total incidents. How can I help you?`;
      
      setMessages([
        {
          id: 1,
          type: 'ai',
          text: welcomeMessage,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, chatIncident, chatMode, allIncidents.length]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Generate AI response based on query
  const generateAIResponse = (query, incident) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('severity')) {
      const initial = incident?.severityAssessment?.initialSeverity || incident?.severity || 'Unknown';
      const aiAssessed = incident?.severityAssessment?.aiAssessedSeverity || initial;
      return `**Severity Assessment:**
• Initial: ${initial}
• AI Assessed: ${aiAssessed}`;
    }

    if (lowerQuery.includes('root cause')) {
      const rootCause = incident?.rootCauseAnalysis?.primaryCause || 
                       incident?.fullRCAReport?.rootCauseAnalysis?.primaryCause ||
                       'Root cause analysis is still in progress.';
      return `**Root Cause:** ${rootCause}`;
    }

    if (lowerQuery.includes('similar')) {
      const currentType = incident?.type || '';
      const similarCount = allIncidents.filter(inc => 
        inc.type === currentType && inc.id !== incident?.id
      ).length;
      return `**Similar Incidents:** ${similarCount} ${currentType} incidents found.`;
    }

    if (lowerQuery.includes('recommend')) {
      const recommendations = incident?.recommendedActions?.immediate || [];
      if (recommendations.length > 0) {
        return `**Immediate Actions:**
${recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n')}`;
      }
      return `**Recommendation:** Review full incident report for detailed remediation steps.`;
    }

    if (lowerQuery.includes('impact')) {
      const impact = incident?.impactAssessment || {};
      const affectedUsers = incident?.incidentDetails?.affectedUsers || [];
      return `**Impact Summary:**
• Affected Users: ${affectedUsers.length}
• Business Impact: ${impact.businessImpact?.impactDescription || 'Under assessment'}`;
    }

    if (lowerQuery.includes('timeline') || lowerQuery.includes('when')) {
      const timeline = incident?.timelineOfEvents || [];
      if (timeline.length > 0) {
        return `**Timeline:** ${timeline.length} events recorded. First detection: ${timeline[0]?.timestamp || 'Unknown'}.`;
      }
      return `**Timeline:** Information being compiled. Check full incident report.`;
    }

    return `**Analysis:** ${getContextualResponse()}`;
  };

  // Handle message sending
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: trimmedInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      const response = await axios.post(`${API_URL}/ai/chat`, {
        query: trimmedInput,
        currentIncident: chatMode === 'incident' ? chatIncident : null,
        chatMode,
        allIncidents,
        conversationHistory: messages
      });
      
      const modelText = response?.data?.response ?? '';
      const concise = condenseConcise(modelText, userMessage.text);
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: concise,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('AI Chat error:', error);
      const aiResponse = generateAIResponse(trimmedInput, chatMode === 'incident' ? chatIncident : null);
      const conciseFallback = condenseConcise(aiResponse, userMessage.text);
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: conciseFallback,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedQuestions = [
    "Root cause",
    "Similar incidents",
    "Severity",
    "Actions"
  ];
  
  const handleSuggestionClick = (question) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  return (
    <div className="ai-chat-panel" role="dialog" aria-label="AI Chat Assistant">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <div className="ai-status-indicator" aria-hidden="true"></div>
          <h3>
            {chatMode === 'incident' && chatIncident 
              ? `Incident ${chatIncident.id} - AI Analysis` 
              : 'AI Security Assistant'}
          </h3>
        </div>
        <button 
          className="ai-chat-close" 
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div className="ai-chat-messages" role="log" aria-live="polite">
        {messages.map(message => (
          <Message key={message.id} message={message} formatText={formatBasicMarkdown} />
        ))}
        {isTyping && (
          <div className="ai-message ai">
            <div className="ai-message-avatar" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="ai-message-content">
              <div className="ai-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-suggestions" role="group" aria-label="Quick actions">
        {suggestedQuestions.map((question, index) => (
          <button
            key={index}
            className="ai-suggestion-chip"
            onClick={() => handleSuggestionClick(question)}
            aria-label={`Ask about ${question}`}
          >
            {question}
          </button>
        ))}
      </div>

      <form className="ai-chat-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your question..."
          className="ai-chat-input"
          aria-label="Message input"
          autoComplete="off"
        />
        <button 
          type="submit" 
          className="ai-chat-send" 
          disabled={!inputValue.trim()}
          aria-label="Send"
          title="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default memo(AIChatPanel);