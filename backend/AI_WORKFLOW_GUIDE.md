# AI Provider Workflow Guide

## Overview

The system is now fully provider-agnostic and supports ANY LLM provider. By changing a single environment variable `AI_PROVIDER`, ALL agents and services will automatically switch between providers. The system includes detailed logging showing agent activation start/end times.

## Supported Providers

- **Gemini** (Google)
- **OpenAI** (Including Azure OpenAI)
- **Anthropic** (Claude)
- **Custom** (Any OpenAI-compatible API)

## How It Works

### 1. Set Provider in `.env`

```bash
# Choose your provider
AI_PROVIDER=gemini      # Google Gemini (default)
AI_PROVIDER=openai      # OpenAI/Azure OpenAI
AI_PROVIDER=anthropic   # Anthropic Claude
AI_PROVIDER=custom      # Any custom LLM
```

### 2. Provider Configuration

#### For Gemini:
```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
GEMINI_MODEL=gemini-2.0-flash
```

#### For OpenAI:
```bash
OPENAI_API_KEY=your-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1/
# OR for Azure OpenAI:
OPENAI_BASE_URL=https://your-instance.openai.azure.com/openai/deployments/your-deployment/
OPENAI_DEPLOYMENT=your-deployment-name
```

#### For Anthropic:
```bash
ANTHROPIC_API_KEY=your-anthropic-key
ANTHROPIC_ENDPOINT=https://api.anthropic.com/v1/messages
ANTHROPIC_MODEL=claude-3-opus-20240229
```

#### For Custom Provider:
```bash
CUSTOM_LLM_NAME=My Custom LLM
CUSTOM_LLM_ENDPOINT=https://your-llm-api.com/v1/chat/completions
CUSTOM_LLM_API_KEY=your-api-key
CUSTOM_LLM_MODEL=your-model-name
CUSTOM_LLM_TYPE=openai  # or 'anthropic' or 'gemini'
```

## Architecture

### Provider-Agnostic Flow

```
┌─────────────────┐
│   User Request  │
└────────┬────────┘
         │
┌────────▼────────┐
│   Any Service   │ (RCA, Email, Chat, etc.)
└────────┬────────┘
         │
┌────────▼────────────────────┐
│       aiService.js          │
│  ┌─────────────────────┐    │
│  │ Check AI_PROVIDER   │    │
│  │ Load Provider Config│    │
│  │ Log Agent START     │    │
│  └─────────────────────┘    │
└────────┬────────────────────┘
         │
    ┌────┴────┬────────┬──────────┐
    │         │        │          │
┌───▼───┐ ┌──▼────┐ ┌─▼────┐ ┌──▼──┐
│Gemini │ │OpenAI │ │Claude│ │Custom│
└───────┘ └───────┘ └──────┘ └─────┘
```

## Agent Activation Logging

Every AI call now includes detailed logging:

```
============================================================
[AI Service] AGENT ACTIVATION - START
[AI Service] Agent: RCA_ANALYST
[AI Service] Provider: openai
[AI Service] Timestamp: 2024-01-20T15:30:45.123Z
============================================================
[AI Service] Prompt length: 10110 characters
[AI Service] Temperature: 0.7
[AI Service] Max tokens: 8000
[AI Service] Calling OpenAI API...
[AI Service] Response received, length: 8543 characters
[AI Service] AGENT ACTIVATION - END
[AI Service] Agent: RCA_ANALYST
[AI Service] Duration: 2024-01-20T15:30:47.456Z
============================================================
```

## Services Using Provider-Agnostic AI

ALL services now automatically use the configured provider:

1. **RCA Analysis** (`geminiService.js`)
2. **Email Verification** (`emailVerificationAgent.js`)
3. **Chat Assistant** (`server.js`)
4. **Any Future Services**

## Workflow Examples

### Example 1: Using Gemini (Default)

```bash
# .env configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
```

All agents automatically use Gemini with full logging.

### Example 2: Switching to Claude

```bash
# .env configuration
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-claude-key
```

All agents instantly switch to Claude.

### Example 3: Using Custom LLM

```bash
# .env configuration
AI_PROVIDER=custom
CUSTOM_LLM_NAME=Llama 3
CUSTOM_LLM_ENDPOINT=http://localhost:8080/v1/chat/completions
CUSTOM_LLM_API_KEY=local-key
CUSTOM_LLM_TYPE=openai
```

All agents use your local Llama instance.

## Key Features

1. **Zero Hardcoding**: No provider names hardcoded anywhere
2. **Complete Logging**: Agent start/end times for debugging
3. **Any LLM Support**: Works with any OpenAI-compatible API
4. **Hot Swapping**: Change providers without code changes
5. **Consistent Prompts**: Same prompts across all providers
6. **Error Handling**: Provider-specific error messages

## API Usage

```javascript
import { callAI } from './services/aiService.js';

// Automatically uses configured provider
const response = await callAI('RCA_ANALYST', {
  incidentData: data
}, {
  temperature: 0.7,
  maxTokens: 10000
});
```

## Available Agents

All agents work with ANY configured provider:
- `RCA_ANALYST` - Root cause analysis
- `EMAIL_VERIFIER` - Email report enhancement
- `CHAT_ASSISTANT` - Interactive chat
- `EVIDENCE_COLLECTOR` - Evidence planning
- `DATA_COLLECTOR` - Data retrieval

## Testing Provider Switch

```bash
# Test with different providers
AI_PROVIDER=gemini node test-integration.js
AI_PROVIDER=openai node test-integration.js
AI_PROVIDER=anthropic node test-integration.js
AI_PROVIDER=custom node test-integration.js
```

## Adding New Providers

To add a new provider:

1. Add configuration to `AI_PROVIDERS` in `aiService.js`
2. Implement provider-specific handler function
3. Map to appropriate request format

## Monitoring

The enhanced logging shows:
- Agent activation timestamps
- Provider being used
- Prompt and response sizes
- Processing duration
- Any errors with context

## Troubleshooting

### Provider Not Working?
1. Check API key environment variable
2. Verify endpoint URL is correct
3. Check provider type mapping
4. Review agent activation logs

### Want to Test Multiple Providers?
```bash
# Quick provider comparison
for provider in gemini openai anthropic; do
  echo "Testing $provider..."
  AI_PROVIDER=$provider node test-integration.js
done
```

## Summary

✅ **NO hardcoded provider names anywhere**  
✅ **Support for ANY LLM provider**  
✅ **Complete agent activation logging**  
✅ **Single env variable controls everything**  
✅ **Hot-swappable providers**  
✅ **Consistent behavior across all providers**