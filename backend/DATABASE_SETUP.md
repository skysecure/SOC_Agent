# MongoDB Setup Guide

## Installation

### Option 1: Local MongoDB

1. **Install MongoDB locally:**
   - macOS: `brew install mongodb-community`
   - Ubuntu: `sudo apt-get install mongodb`
   - Windows: Download from [MongoDB website](https://www.mongodb.com/try/download/community)

2. **Start MongoDB:**
   ```bash
   # macOS/Linux
   mongod --dbpath /usr/local/var/mongodb
   
   # Or using brew services (macOS)
   brew services start mongodb-community
   ```

### Option 2: Docker

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name soc-mongodb mongo:latest

# Stop MongoDB
docker stop soc-mongodb

# Start MongoDB again
docker start soc-mongodb
```

### Option 3: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string
4. Update `.env` with the Atlas connection string

## Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Update MongoDB settings in `.env`:**
   ```env
   # For local MongoDB
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=soc_agent_db
   
   # For MongoDB Atlas
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
   # MONGODB_DB=soc_agent_db
   ```

## Database Initialization

### First-time Setup

1. **Initialize the database and create indexes:**
   ```bash
   npm run db:init
   ```

2. **Migrate tenants from JSON (if needed):**
   ```bash
   npm run db:migrate-tenants
   ```

### Starting the Server

The server will automatically:
1. Connect to MongoDB on startup
2. Create necessary indexes
3. Migrate tenants from `config/tenants.json` if the database is empty
4. Fall back to in-memory storage if MongoDB is unavailable

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## Collections

### incidents
Stores all security incidents with analysis reports.

**Schema:**
- `_id`: MongoDB ObjectId
- `legacyId`: Original timestamp-based ID
- `incidentNumber`: Unique incident identifier
- `timestamp`: Incident occurrence time
- `severity`: AI-assessed severity level
- `status`: Current status (Active/Closed)
- `tenant`: Tenant information
- `report`: Full analysis report
- `emailTracking`: Email notification tracking
- `createdAt`: Database record creation
- `updatedAt`: Last modification time

**Indexes:**
- `{ incidentNumber: 1 }` - Unique incident lookup
- `{ "tenant.key": 1, timestamp: -1 }` - Tenant filtering
- `{ status: 1, severity: 1 }` - Dashboard filters
- `{ timestamp: -1 }` - Recent incidents
- `{ legacyId: 1 }` - Backward compatibility

### tenants
Stores tenant configurations for multi-tenancy support.

**Schema:**
- `_id`: MongoDB ObjectId
- `key`: Unique tenant identifier
- `displayName`: Human-readable name
- `subscriptionId`: Azure subscription
- `tenantId`: Azure AD tenant
- `clientId`: Service principal
- `clientSecret`: Service principal secret
- `isActive`: Enable/disable flag
- `emailNotifications`: Email toggle
- `autoAssignIncidents`: Sentinel auto-assign

**Indexes:**
- `{ key: 1 }` - Unique tenant key
- `{ subscriptionId: 1 }` - Azure lookups
- `{ isActive: 1 }` - Filter active tenants

## Monitoring

### Check Database Connection
```bash
# Using MongoDB shell
mongosh
use soc_agent_db
db.incidents.countDocuments()
db.tenants.countDocuments()
```

### View Server Logs
The server logs database operations:
- `[MongoDB] Connected successfully`
- `[Server] Database: Connected`
- `[ANALYSE] Incident stored in database`

### Health Check
```bash
curl http://localhost:3002/health
```

## Troubleshooting

### Connection Issues

1. **Check MongoDB is running:**
   ```bash
   # Check process
   ps aux | grep mongod
   
   # Check port
   lsof -i :27017
   ```

2. **Test connection:**
   ```bash
   mongosh mongodb://localhost:27017
   ```

3. **Check logs:**
   - MongoDB logs: `/usr/local/var/log/mongodb/mongo.log`
   - Server logs: Check console output

### Migration Issues

1. **Tenants not migrating:**
   - Ensure `config/tenants.json` exists
   - Check file permissions
   - Run manual migration: `npm run db:migrate-tenants`

2. **Incidents not saving:**
   - Check database connection in health endpoint
   - Verify write permissions
   - Check server logs for errors

### Performance

1. **Slow queries:**
   - Indexes are created automatically
   - Check index usage: `db.incidents.getIndexes()`
   - Monitor query performance in MongoDB Compass

2. **Memory usage:**
   - The server maintains dual storage (DB + memory) during migration
   - Once stable, remove in-memory array from `server.js`

## Backup and Restore

### Backup
```bash
# Backup entire database
mongodump --db soc_agent_db --out ./backup

# Backup specific collection
mongodump --db soc_agent_db --collection incidents --out ./backup
```

### Restore
```bash
# Restore entire database
mongorestore --db soc_agent_db ./backup/soc_agent_db

# Restore specific collection
mongorestore --db soc_agent_db --collection incidents ./backup/soc_agent_db/incidents.bson
```

## Production Considerations

1. **Security:**
   - Enable MongoDB authentication
   - Use connection string with credentials
   - Encrypt sensitive fields (clientSecret)
   - Use SSL/TLS connections

2. **Scaling:**
   - Configure replica sets for high availability
   - Implement sharding for large datasets
   - Use connection pooling (already configured)

3. **Monitoring:**
   - Set up MongoDB monitoring
   - Configure alerts for connection failures
   - Monitor query performance
   - Track collection sizes

4. **Maintenance:**
   - Regular backups
   - Index optimization
   - Log rotation
   - Data retention policies
