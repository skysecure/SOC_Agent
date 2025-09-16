import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TENANTS_PATH = path.resolve(__dirname, '../config/tenants.json');

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateTenants(tenants) {
  const errors = [];

  if (!Array.isArray(tenants) || tenants.length === 0) {
    errors.push('Tenants must be a non-empty array');
    return { ok: false, errors };
  }

  const keys = new Set();
  const subs = new Set();

  tenants.forEach((t, idx) => {
    const prefix = `tenant[${idx}]`;
    const required = ['key','displayName','tenantId','clientId','clientSecret','subscriptionId','resourceGroup','workspaceName','ownerName','ownerEmail','customerMail'];
    required.forEach((f) => {
      if (!t || t[f] === undefined || t[f] === null || (typeof t[f] === 'string' && t[f].trim().length === 0)) {
        errors.push(`${prefix} missing required field: ${f}`);
      }
    });

    if (t && t.key) {
      if (keys.has(t.key)) errors.push(`${prefix} duplicate key: ${t.key}`); else keys.add(t.key);
    }
    if (t && t.subscriptionId) {
      if (subs.has(t.subscriptionId)) errors.push(`${prefix} duplicate subscriptionId: ${t.subscriptionId}`); else subs.add(t.subscriptionId);
    }

    if (t && t.ownerEmail && !isValidEmail(t.ownerEmail)) {
      errors.push(`${prefix} invalid ownerEmail: ${t.ownerEmail}`);
    }

    const recipients = t?.customerMail?.toSenderMail;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      errors.push(`${prefix} customerMail.toSenderMail must be a non-empty array`);
    } else {
      recipients.forEach((e, i) => {
        if (!isValidEmail(e)) errors.push(`${prefix} invalid recipient at customerMail.toSenderMail[${i}]: ${e}`);
      });
    }
  });

  return { ok: errors.length === 0, errors };
}

function loadTenants() {
  const override = process.env.TENANTS_JSON;
  const sourcePath = TENANTS_PATH;

  const safeParse = (raw, sourceLabel) => {
    try {
      if (typeof raw !== 'string' || raw.trim().length === 0) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error(`[TenantService] Failed to parse tenants JSON from ${sourceLabel}:`, e.message);
      return null;
    }
  };

  try {
    // 1) Try environment override first
    let parsed = null;
    if (override && override.trim().length > 0) {
      parsed = safeParse(override, 'TENANTS_JSON env');
      if (!parsed) {
        console.warn('[TenantService] TENANTS_JSON env is invalid; falling back to file');
      }
    }

    // 2) Fallback to file if needed
    if (!parsed) {
      if (fs.existsSync(sourcePath)) {
        const fileRaw = fs.readFileSync(sourcePath, 'utf-8');
        parsed = safeParse(fileRaw, `file ${sourcePath}`);
      } else {
        console.warn(`[TenantService] Tenants file not found at ${sourcePath}`);
      }
    }

    // 3) If still nothing or empty, proceed with zero tenants (non-fatal) and guidance
    if (!parsed) {
      console.warn('[TenantService] No valid tenants configuration found. Continuing with zero tenants.');
      console.warn('[TenantService] Configure tenants via TENANTS_JSON env or create backend/config/tenants.json');
      return [];
    }
    if (Array.isArray(parsed) && parsed.length === 0) {
      console.warn('[TenantService] Tenants configuration is an empty array; continuing with zero tenants.');
      return [];
    }

    // 4) Validate non-empty configuration
    const { ok, errors } = validateTenants(parsed);
    if (!ok) {
      console.error('[TenantService] Validation failed:', errors);
      throw new Error('Invalid tenants configuration');
    }
    return parsed;
  } catch (err) {
    console.error('[TenantService] Failed to load tenants:', err.message);
    throw err;
  }
}

const tenants = loadTenants();
const tenantsByKey = new Map();
const tenantsBySubscription = new Map();

tenants.forEach((t) => {
  tenantsByKey.set(t.key, t);
  tenantsBySubscription.set(String(t.subscriptionId).toLowerCase(), t);
});

export function listTenants() {
  return tenants.map(t => ({ key: t.key, displayName: t.displayName, subscriptionId: t.subscriptionId }));
}

export function getTenantByKey(key) {
  return tenantsByKey.get(key) || null;
}

export function getTenantBySubscriptionId(subscriptionId) {
  if (!subscriptionId) return null;
  return tenantsBySubscription.get(String(subscriptionId).toLowerCase()) || null;
}

export function extractSubscriptionIdFromArmId(armIdOrName) {
  if (!armIdOrName || typeof armIdOrName !== 'string') return null;
  const m = armIdOrName.match(/\/subscriptions\/(\w[\w-]*)\//i);
  return m ? m[1] : null;
}


