import { MongoClient } from 'mongodb';
import dbConfig from '../config/database.js';

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return this.db;
    }

    try {
      console.log('[MongoDB] Connecting to database...');
      
      this.client = new MongoClient(dbConfig.uri, dbConfig.options);
      await this.client.connect();
      
      // Verify connection
      await this.client.db('admin').command({ ping: 1 });
      
      this.db = this.client.db(dbConfig.dbName);
      this.isConnected = true;
      
      console.log(`[MongoDB] Connected successfully to database: ${dbConfig.dbName}`);
      
      // Set up connection event handlers
      this.client.on('serverClosed', () => {
        console.log('[MongoDB] Server connection closed');
        this.isConnected = false;
      });
      
      this.client.on('error', (error) => {
        console.error('[MongoDB] Connection error:', error);
        this.isConnected = false;
      });
      
      // Create indexes
      await this.createIndexes();
      
      return this.db;
    } catch (error) {
      console.error('[MongoDB] Failed to connect:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async createIndexes() {
    try {
      console.log('[MongoDB] Creating indexes...');
      
      // Incidents collection indexes
      const incidents = this.db.collection(dbConfig.collections.incidents);
      await incidents.createIndex({ incidentNumber: 1 }, { sparse: true });
      await incidents.createIndex({ 'tenant.key': 1, timestamp: -1 });
      await incidents.createIndex({ status: 1, severity: 1 });
      await incidents.createIndex({ timestamp: -1 });
      await incidents.createIndex({ legacyId: 1 });
      await incidents.createIndex({ armId: 1 }, { sparse: true });
      await incidents.createIndex({ createdAt: -1 });
      
      // Tenants collection indexes
      const tenants = this.db.collection(dbConfig.collections.tenants);
      await tenants.createIndex({ key: 1 }, { unique: true });
      await tenants.createIndex({ subscriptionId: 1 }, { sparse: true });
      await tenants.createIndex({ isActive: 1 });
      
      console.log('[MongoDB] Indexes created successfully');
    } catch (error) {
      console.error('[MongoDB] Error creating indexes:', error);
      // Don't throw - indexes are not critical for basic operation
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('[MongoDB] Disconnected from database');
    }
  }

  getCollection(name) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.db.collection(name);
  }

  getDb() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  isReady() {
    return this.isConnected;
  }

  // Helper method for retrying operations
  async withRetry(operation, retries = dbConfig.retry.maxAttempts) {
    let lastError;
    let delay = dbConfig.retry.initialDelayMs;

    for (let i = 0; i < retries; i++) {
      try {
        if (!this.isConnected) {
          await this.connect();
        }
        return await operation();
      } catch (error) {
        lastError = error;
        console.error(`[MongoDB] Operation failed (attempt ${i + 1}/${retries}):`, error.message);
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, dbConfig.retry.maxDelayMs);
        }
      }
    }
    
    throw lastError;
  }
}

// Create singleton instance
const database = new Database();

export default database;
export { dbConfig };
