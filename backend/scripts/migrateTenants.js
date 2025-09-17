import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import database from '../services/db.js';
import tenantRepository from '../repositories/tenantRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateTenants() {
  try {
    console.log('[Migration] Starting tenant migration...');
    
    // Connect to database
    await database.connect();
    
    // Read tenants.json file
    const tenantsFilePath = path.join(__dirname, '../config/tenants.json');
    
    if (!fs.existsSync(tenantsFilePath)) {
      console.log('[Migration] No tenants.json file found, skipping migration');
      return;
    }
    
    const tenantsData = JSON.parse(fs.readFileSync(tenantsFilePath, 'utf8'));
    
    if (!tenantsData.tenants || !Array.isArray(tenantsData.tenants)) {
      console.log('[Migration] Invalid tenants.json format');
      return;
    }
    
    console.log(`[Migration] Found ${tenantsData.tenants.length} tenants to migrate`);
    
    // Migrate each tenant
    let successCount = 0;
    let errorCount = 0;
    
    for (const tenant of tenantsData.tenants) {
      try {
        // Prepare tenant document with ALL fields from JSON
        const tenantDoc = {
          key: tenant.key,
          displayName: tenant.displayName,
          subscriptionId: tenant.subscriptionId,
          resourceGroup: tenant.resourceGroup,
          workspaceName: tenant.workspaceName,
          tenantId: tenant.tenantId,
          clientId: tenant.clientId,
          clientSecret: tenant.clientSecret,
          ownerEmail: tenant.ownerEmail || tenant.sentinelOwnerEmail,
          ownerUPN: tenant.ownerUPN || tenant.ownerUpn || tenant.sentinelOwnerUPN,
          ownerObjectId: tenant.ownerObjectId || tenant.sentinelOwnerObjectId,
          ownerName: tenant.ownerName,
          customerMail: tenant.customerMail, // Include customerMail object
          isActive: true,
          emailNotifications: true,
          autoAssignIncidents: true
        };
        
        // Upsert tenant (update if exists, insert if not)
        await tenantRepository.upsert(tenantDoc);
        
        console.log(`[Migration] ✓ Migrated tenant: ${tenant.key} (${tenant.displayName})`);
        successCount++;
      } catch (error) {
        console.error(`[Migration] ✗ Failed to migrate tenant ${tenant.key}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`[Migration] Migration completed: ${successCount} success, ${errorCount} errors`);
    
    // Verify migration
    const dbTenants = await tenantRepository.findAll(true);
    console.log(`[Migration] Total tenants in database: ${dbTenants.length}`);
    
    // Create backup of tenants.json
    const backupPath = path.join(__dirname, '../config/tenants.json.backup');
    fs.copyFileSync(tenantsFilePath, backupPath);
    console.log(`[Migration] Created backup: ${backupPath}`);
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
    process.exit(0);
  }
}

// Run migration if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateTenants();
}

export default migrateTenants;
