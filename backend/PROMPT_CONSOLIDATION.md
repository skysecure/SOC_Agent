# Prompt Consolidation System

## Overview

All AI prompts are now centralized in a single configuration file to ensure consistency across different AI providers (Gemini and OpenAI) and agents. This eliminates duplicate prompts and makes maintenance easier.

**UPDATE**: As of the latest version, both OpenAI and Gemini use the exact same full prompts. Short version functionality has been removed to ensure complete consistency.

## Architecture

### 1. Central Configuration (`backend/config/prompts.js`)

- **CORE**: Reusable prompt components shared across agents
  - `SEVERITY_ASSESSMENT`: Threat sophistication guidelines
  - `ANALYSIS_REQUIREMENTS`: Common analysis standards
  - `JSON_FORMAT`: Output format requirements
  - `RCA_STRUCTURE`: RCA report structure

- **AGENTS**: Agent-specific prompts
  - `RCA_ANALYST`: Root Cause Analysis agent
  - `EVIDENCE_COLLECTOR`: Evidence collection planning
  - `DATA_COLLECTOR`: Data retrieval requests
  - `EMAIL_VERIFIER`: Email report enhancement
  - `CHAT_ASSISTANT`: Interactive chat responses

- ~~**SHORT_VERSIONS**~~: **REMOVED** - All providers now use the same full prompts

### 2. Prompt Builder (`backend/utils/promptBuilder.js`)

Main function: `buildPrompt(agentName, options)`

Options:
- `incidentData`: For RCA analysis
- `htmlContent`: For email verification
- `rcaData`: For email verification
- `chatMode`: For chat assistant
- `incidentContext`: For chat assistant
- `useShortVersion`: **DEPRECATED** - Ignored, all providers use full prompts
- `provider`: 'gemini' or 'openai'

Helper functions:
- `estimateTokenCount(prompt)`: Estimate token usage
- `shouldUseShortVersion(prompt, provider)`: **DEPRECATED** - Always returns false
- `validatePromptData(agentName, data)`: Validate required data

## Usage Examples

### RCA Analysis (Gemini)
```javascript
const prompt = buildPrompt('RCA_ANALYST', {
  incidentData: incidentData,
  provider: 'gemini'
});
```

### RCA Analysis (OpenAI - now uses same full prompt as Gemini)
```javascript
const prompt = buildPrompt('RCA_ANALYST', {
  incidentData: incidentData,
  provider: 'openai'
});
```

### Email Verification
```javascript
const prompt = buildPrompt('EMAIL_VERIFIER', {
  htmlContent: htmlReport,
  rcaData: rcaData,
  provider: 'gemini'
});
```

### Chat Assistant
```javascript
const prompt = buildPrompt('CHAT_ASSISTANT', {
  chatMode: 'incident',
  incidentContext: contextString,
  provider: 'gemini'
});
```

## Benefits

1. **Single Source of Truth**: All prompts in one place
2. **Provider Agnostic**: Same interface for both Gemini and OpenAI
3. **Consistent Prompts**: Both providers use the same full prompts
4. **Easy Maintenance**: Update prompts without touching service code
5. **Consistent Behavior**: Same prompts ensure consistent AI responses
6. **Version Control**: Track prompt changes in one file

## Migration from Old System

The old system had:
- `agentInstructions.js` with Agent1_instructions, Agent2_instructions, etc.
- Inline prompts in various services
- Different prompts for OpenAI vs Gemini

Now everything is centralized and consistent.

## Testing

Run `node test-prompts.js` or `node test-full-prompts.js` to verify:
- All agents are properly configured
- Prompts build correctly for both providers
- Token counting works
- Backward compatibility maintained

## Adding New Agents

1. Add agent configuration to `PROMPTS.AGENTS` in `config/prompts.js`
2. Implement `getFullPrompt()` method if dynamic
3. ~~Add short version to `SHORT_VERSIONS` if needed~~ - No longer applicable
4. Update `promptBuilder.js` if special handling required
5. Add test cases to `test-prompts.js`