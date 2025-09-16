import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Debug mode flag
const DEBUG = process.env.SENTINEL_DEBUG === 'true';

// Global endpoints are shared
const requiredGlobalEnv = [
  'AZURE_LOGIN_URL',
  'AZURE_MANAGEMENT_API_URL'
];

requiredGlobalEnv.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
  } else if (DEBUG) {
    console.log(`✅ Environment variable ${varName} is configured`);
  }
});

if (DEBUG) {
  console.log('🔍 Azure Auth Service Debug Mode Enabled');
  console.log('Configured Azure endpoints:', {
    loginUrl: process.env.AZURE_LOGIN_URL,
    managementUrl: process.env.AZURE_MANAGEMENT_API_URL
  });
}

// Per-tenant token caches keyed by tenant key
const tokenCacheByTenant = new Map(); // key -> { accessToken, expiresAt }

function getTenantKey(tenantCtx) {
  return tenantCtx?.key || tenantCtx?.tenantId || 'default';
}

export async function getAzureToken(tenantCtx) {
  const tenantKey = getTenantKey(tenantCtx);
  const cache = tokenCacheByTenant.get(tenantKey) || { accessToken: null, expiresAt: 0 };

  if (cache.accessToken && cache.expiresAt > Date.now()) {
    const remainingTime = Math.round((cache.expiresAt - Date.now()) / 1000);
    if (DEBUG) {
      console.log(`🔐 Using cached Azure token for ${tenantKey} (expires in ${remainingTime} seconds)`);
    }
    return cache.accessToken;
  }

  try {
    const tenantId = tenantCtx?.tenantId;
    const clientId = tenantCtx?.clientId;
    const clientSecret = tenantCtx?.clientSecret;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Missing tenant credentials: tenantId/clientId/clientSecret');
    }

    const tokenUrl = `${process.env.AZURE_LOGIN_URL}/${tenantId}/oauth2/v2.0/token`;
    const scope = `${process.env.AZURE_MANAGEMENT_API_URL}/.default`;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope
    });

    if (DEBUG) {
      console.log('🔄 Requesting new Azure access token', {
        tenantKey,
        url: tokenUrl,
        scope
      });
    }

    const startTime = Date.now();
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const requestTime = Date.now() - startTime;

    const next = {
      accessToken: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in * 1000) - 60000
    };
    tokenCacheByTenant.set(tenantKey, next);

    console.log(`✅ Azure token obtained for ${tenantKey} (${requestTime}ms), ttl: ${response.data.expires_in}s`);
    return next.accessToken;
  } catch (error) {
    console.error('❌ Azure authentication failed for tenant', getTenantKey(tenantCtx));
    if (DEBUG) {
      console.error('Detailed error information:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: error.response?.data?.error,
        error_description: error.response?.data?.error_description,
        correlation_id: error.response?.data?.correlation_id,
        timestamp: new Date().toISOString()
      });
    }
    throw new Error(`Azure authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}

export function clearTokenCache(tenantCtx) {
  const tenantKey = getTenantKey(tenantCtx);
  if (DEBUG) {
    console.log('🔄 Clearing Azure token cache', { tenantKey });
  }
  if (tenantKey === 'default') {
    tokenCacheByTenant.clear();
  } else {
    tokenCacheByTenant.delete(tenantKey);
  }
}