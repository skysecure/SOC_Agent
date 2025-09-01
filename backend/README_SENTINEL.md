# Azure Sentinel Integration

## Debug Mode

Set `SENTINEL_DEBUG=true` in your `.env` file to enable comprehensive debug logging for troubleshooting.

## Overview
This integration automatically assigns incidents to analysts after RCA completion. When an incident is analyzed, the system will:
1. Extract the AI-assessed severity from the RCA report
2. Update the incident in Azure Sentinel with the new severity
3. Assign the incident to the configured analyst

## Configuration

### 1. Environment Variables
Copy `.env.example` to `.env` and configure the following:

```env
# Azure AD Authentication
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-app-client-id
AZURE_CLIENT_SECRET=your-app-client-secret

# Azure Resource Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=your-resource-group
AZURE_WORKSPACE_NAME=your-sentinel-workspace

# Azure API Configuration
AZURE_MANAGEMENT_API_URL=https://management.azure.com
AZURE_LOGIN_URL=https://login.microsoftonline.com
SENTINEL_API_VERSION=2025-06-01

# Incident Assignment Configuration
SENTINEL_OWNER_NAME=Analyst Name
SENTINEL_OWNER_UPN=analyst@domain.com
SENTINEL_OWNER_EMAIL=analyst@domain.com
SENTINEL_OWNER_OBJECT_ID=analyst-object-id
```

### 2. Azure AD Application Setup
1. Create an Azure AD application in your tenant
2. Generate a client secret
3. Note the Application (client) ID and Directory (tenant) ID

### 3. Required Permissions
Your Azure AD application needs the following permissions:
- `Microsoft.OperationalInsights/workspaces/read`
- `Microsoft.SecurityInsights/incidents/write`

Grant these permissions:
```bash
# Using Azure CLI
az role assignment create --assignee <app-client-id> \
  --role "Microsoft Sentinel Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.OperationalInsights/workspaces/<workspace-name>"
```

## Usage

### Incident Analysis
When you submit an incident for analysis that contains a Sentinel incident ID, the system will:
1. Perform RCA analysis using AI
2. Extract the AI-assessed severity
3. Update the incident in Sentinel
4. Assign it to the configured analyst

The incident ID can be in any of these locations in the request:
- `object.id` (Logic App format)
- `id`
- `properties.id`
- `name`

### Health Check
Verify Sentinel connectivity:
```bash
GET http://localhost:3002/sentinel/health
```

Response:
```json
{
  "connected": true,
  "hasToken": true,
  "configuration": {
    "subscription": "789ffe48-9506-43da-b629-b0b9174bad4d",
    "resourceGroup": "SOCAutomationAgent",
    "workspace": "SOCAutomation",
    "assignee": "Vijay.Ganesh@sstlab.in"
  }
}
```

## Frontend Display
The analysis report will include a "Sentinel Auto-Assignment" section showing:
- ✅ Success status with assignment details
- ❌ Error status with specific error messages
- Assignment timestamp
- Updated severity

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check client ID and secret
   - Verify tenant ID
   - Ensure app has required permissions

2. **404 Not Found**
   - Verify incident ID format
   - Check workspace and resource group names
   - Ensure incident exists in Sentinel

3. **403 Forbidden**
   - Application lacks required permissions
   - Check role assignments

4. **Missing Configuration**
   - Server logs will show which env variables are missing
   - All Azure configuration is required for auto-assignment

### Debug Tips

1. Enable verbose logging:
   - Set `SENTINEL_DEBUG=true` in `.env` file
   - Check server console for detailed logs with:
     * Token request/response details (sensitive data masked)
     * API request timing and performance metrics  
     * Detailed error information with correlation IDs
     * Specific error hints for common issues
   - Assignment attempts are logged with incident details

2. Debug log examples:
   ```
   🔄 Requesting new Azure access token...
   ✅ Azure token obtained successfully (215ms)
   🚀 Attempting Sentinel auto-assignment
   🎯 Updating Sentinel incident: INC-12345
   ✅ Sentinel incident updated successfully (187ms)
   ```

3. Test authentication separately:
   ```bash
   curl -X POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token \
     -d "grant_type=client_credentials&client_id=<client-id>&client_secret=<secret>&scope=https://management.azure.com/.default"
   ```

3. Test incident update manually:
   ```bash
   curl -X PUT "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.OperationalInsights/workspaces/<workspace>/providers/Microsoft.SecurityInsights/incidents/<incident-id>?api-version=2025-06-01" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"properties":{"status":"Active"}}'
   ```

## Security Considerations

1. **Credentials**: Never commit `.env` file with real credentials
2. **Token Caching**: Tokens are cached to minimize auth requests
3. **Error Messages**: Sensitive details are logged server-side only
4. **HTTPS**: Always use HTTPS in production

## Limitations

1. Sentinel API version is set to `2025-06-01`
2. Only updates severity and assignment
3. Assigns to single configured analyst (no rotation)
4. Requires incident ID in request payload