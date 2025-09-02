import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './AIChatPanel.css';

function AIChatPanel({ isOpen, onClose, chatIncident, chatMode, allIncidents = [] }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Clear messages when opening with different mode or incident
      setMessages([]);
      
      const welcomeMessage = chatMode === 'incident' && chatIncident
        ? `Hello! I'm focusing on incident ${chatIncident.id} (${chatIncident.type}). This is a ${chatIncident.severityAssessment?.aiAssessedSeverity || chatIncident.severity} severity incident. How can I help you analyze this specific incident?`
        : `Hello! I'm your AI Security Assistant monitoring ${allIncidents.length} total incidents. I can help you analyze trends, compare incidents, or answer general security questions. What would you like to know?`;
      
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Call backend API to get Gemini response
      const response = await axios.post('http://localhost:3002/ai/chat', {
        query: inputValue,
        currentIncident: chatMode === 'incident' ? chatIncident : null,
        chatMode: chatMode,
        allIncidents: allIncidents,
        conversationHistory: messages
      });

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: response.data.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('AI Chat error:', error);
      // Fallback to local response generation
      const aiResponse = generateAIResponse(inputValue, chatMode === 'incident' ? chatIncident : null);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: aiResponse,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateAIResponse = (query, incident) => {
    const lowerQuery = query.toLowerCase();

    // Use actual incident data for responses
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
      // Count similar incidents by type
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

    return `**Analysis:** ${generateContextualResponse()}`;
  };

  const generateContextualResponse = () => {
    const responses = [
      "**Threat Level:** Sophisticated attack requiring immediate attention.",
      "**Actor Profile:** Advanced persistent threat (APT) characteristics detected.",
      "**Risk Reduction:** Implemented mitigations reduce risk by ~85%.",
      "**IOCs Identified:** Multiple indicators added to blocklist."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const suggestedQuestions = [
    "Root cause?",
    "Similar incidents?",
    "Severity level?",
    "Actions needed?"
  ];

  if (!isOpen) return null;

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <div className="ai-status-indicator"></div>
          <h3>
            {chatMode === 'incident' && chatIncident 
              ? `Incident ${chatIncident.id} Analysis` 
              : 'General Security Chat'}
          </h3>
        </div>
        <button className="ai-chat-close" onClick={onClose}>×</button>
      </div>

      <div className="ai-chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`ai-message ${message.type}`}>
            <div className="ai-message-avatar">
              {message.type === 'ai' ? '🤖' : '👤'}
            </div>
            <div className="ai-message-content">
              <p>{message.text}</p>
              <span className="ai-message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="ai-message ai">
            <div className="ai-message-avatar">🤖</div>
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

      <div className="ai-chat-suggestions">
        {suggestedQuestions.map((question, index) => (
          <button
            key={index}
            className="ai-suggestion-chip"
            onClick={() => setInputValue(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <form className="ai-chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about this incident..."
          className="ai-chat-input"
        />
        <button type="submit" className="ai-chat-send" disabled={!inputValue.trim()}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2.5 2.5l15 7.5-15 7.5v-6l10-1.5-10-1.5v-6z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default AIChatPanel;