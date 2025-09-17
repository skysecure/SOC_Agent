// MongoDB configuration
export const dbConfig = {
  // Connection settings
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB || 'soc_agent_db',
  
  // Connection pool settings
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4
  },
  
  // Collection names
  collections: {
    incidents: 'incidents',
    tenants: 'tenants',
    auditLogs: 'audit_logs'
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000
  }
};

export default dbConfig;
