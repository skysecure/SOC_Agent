import database from '../services/db.js';
import migrateTenants from './migrateTenants.js';

async function initializeDatabase() {
  try {
    console.log('[InitDB] Initializing database...');
    
    // Connect to database
    await database.connect();
    
    // Check if database is ready
    if (!database.isReady()) {
      throw new Error('Database connection failed');
    }
    
    console.log('[InitDB] Database connected successfully');
    
    // Indexes are created automatically in db.js connect method
    console.log('[InitDB] Indexes have been created');
    
    // Check if tenants collection is empty
    const tenantsCollection = database.getCollection('tenants');
    const tenantCount = await tenantsCollection.countDocuments();
    
    if (tenantCount === 0) {
      console.log('[InitDB] No tenants found, running migration...');
      // Note: migrateTenants will handle its own connection
      await database.disconnect();
      await migrateTenants();
    } else {
      console.log(`[InitDB] Found ${tenantCount} existing tenants`);
    }
    
    console.log('[InitDB] Database initialization completed');
    
  } catch (error) {
    console.error('[InitDB] Initialization failed:', error);
    process.exit(1);
  } finally {
    if (database.isReady()) {
      await database.disconnect();
    }
    process.exit(0);
  }
}

// Run initialization if executed directly
if (process.argv[1].includes('initDb.js')) {
  initializeDatabase();
}

export default initializeDatabase;
