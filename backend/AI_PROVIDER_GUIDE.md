# AI Provider Configuration Guide

This system now supports both Gemini and OpenAI for incident analysis with a flag-based selection system.

## ⚠️ Important Notes for GPT-5-mini

The GPT-5-mini model has specific requirements:
- **Temperature**: Must be 1 (default value only)
- **Token parameter**: Use `max_completion_tokens` instead of `max_tokens`
- **Large responses**: May be truncated if the response exceeds token limits
- **Reasoning tokens**: GPT-5-mini uses reasoning tokens internally, which count against the completion limit

## Configuration

### 1. Environment Variables

Update your `.env` file with the following configuration:

```env
# AI Provider Configuration
AI_PROVIDER=openai  # Options: gemini, openai

# OpenAI Configuration (Azure OpenAI)
OPENAI_API_KEY="your-azure-openai-api-key"
OPENAI_BASE_URL="https://ai-vijayganesh6247ai744780589809.openai.azure.com/openai/v1/"
OPENAI_DEPLOYMENT="gpt-5-mini"
OPENAI_MODEL="gpt-5-mini"

# Existing Gemini Configuration
GEMINI_API_KEY=AIzaSyCeu2yufCNXYgFzOueHmYvrDTEXX_4Pq-c
```

### 2. Switching Providers

To switch between providers, simply change the `AI_PROVIDER` value:
- `AI_PROVIDER=gemini` - Uses Google Gemini
- `AI_PROVIDER=openai` - Uses Azure OpenAI

### 3. Testing

Test your configuration:
```bash
node test-openai.js
```

## Features

- **Seamless Switching**: Change providers without code modifications
- **Same API Interface**: Both providers return the same response format
- **Error Handling**: Graceful fallback and clear error messages
- **Azure OpenAI Support**: Full compatibility with Azure-hosted OpenAI services

## API Key Setup

### For Azure OpenAI:
1. Get your API key from Azure OpenAI resource
2. Note your endpoint URL and deployment name
3. Update the `.env` file with these values

### For Gemini:
1. API key is already configured in the `.env` file
2. No additional setup needed

## Troubleshooting

### OpenAI API Key Not Working:
- Ensure you're using the correct Azure API key (not standard OpenAI)
- Verify the endpoint URL matches your Azure resource
- Check that the deployment name is correct

### Response Format Issues:
- Both providers are configured to return JSON
- The transformation logic normalizes responses
- Check console logs for parsing errors

## Performance Comparison

| Feature | Gemini | OpenAI (GPT-5-mini) |
|---------|--------|---------------------|
| Response Time | ~2-3s | ~1-2s |
| Token Limit | Higher | 4000 tokens |
| Cost | Free (with limits) | Pay per token |
| Accuracy | High | Very High |

## Future Enhancements

- Fallback mechanism (if one provider fails, use the other)
- Response caching
- Cost tracking
- Performance metrics dashboard