import { ObjectId } from 'mongodb';
import database, { dbConfig } from '../services/db.js';

class TenantRepository {
  constructor() {
    this.collectionName = dbConfig.collections.tenants;
  }

  getCollection() {
    return database.getCollection(this.collectionName);
  }

  async create(tenant) {
    try {
      const doc = {
        ...tenant,
        isActive: tenant.isActive !== false, // Default to true
        emailNotifications: tenant.emailNotifications !== false,
        autoAssignIncidents: tenant.autoAssignIncidents !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await this.getCollection().insertOne(doc);
      return { ...doc, _id: result.insertedId };
    } catch (error) {
      console.error('[TenantRepository] Error creating tenant:', error);
      throw error;
    }
  }

  async findAll(includeInactive = false) {
    try {
      const filter = includeInactive ? {} : { isActive: true };
      
      const tenants = await this.getCollection()
        .find(filter)
        .sort({ displayName: 1 })
        .toArray();
      
      return tenants;
    } catch (error) {
      console.error('[TenantRepository] Error finding tenants:', error);
      throw error;
    }
  }

  async findByKey(key) {
    try {
      return await this.getCollection().findOne({ key });
    } catch (error) {
      console.error('[TenantRepository] Error finding tenant by key:', error);
      throw error;
    }
  }

  async findBySubscriptionId(subscriptionId) {
    try {
      return await this.getCollection().findOne({ subscriptionId });
    } catch (error) {
      console.error('[TenantRepository] Error finding tenant by subscription:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      if (!ObjectId.isValid(id)) {
        return null;
      }
      
      return await this.getCollection().findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('[TenantRepository] Error finding tenant by ID:', error);
      throw error;
    }
  }

  async update(key, updates) {
    try {
      const { _id, key: updateKey, ...updateData } = updates;
      
      const update = {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      };
      
      const result = await this.getCollection().updateOne(
        { key },
        update
      );
      
      return result;
    } catch (error) {
      console.error('[TenantRepository] Error updating tenant:', error);
      throw error;
    }
  }

  async upsert(tenant) {
    try {
      const { key, ...data } = tenant;
      
      const update = {
        $set: {
          ...data,
          updatedAt: new Date()
        },
        $setOnInsert: {
          key,
          createdAt: new Date()
        }
      };
      
      const result = await this.getCollection().updateOne(
        { key },
        update,
        { upsert: true }
      );
      
      return result;
    } catch (error) {
      console.error('[TenantRepository] Error upserting tenant:', error);
      throw error;
    }
  }

  async delete(key) {
    try {
      const result = await this.getCollection().deleteOne({ key });
      return result;
    } catch (error) {
      console.error('[TenantRepository] Error deleting tenant:', error);
      throw error;
    }
  }

  async toggleActive(key, isActive) {
    try {
      const result = await this.getCollection().updateOne(
        { key },
        {
          $set: {
            isActive,
            updatedAt: new Date()
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error('[TenantRepository] Error toggling tenant active status:', error);
      throw error;
    }
  }

  async count(filter = {}) {
    try {
      return await this.getCollection().countDocuments(filter);
    } catch (error) {
      console.error('[TenantRepository] Error counting tenants:', error);
      throw error;
    }
  }

  // Get tenant configuration for Sentinel integration
  async getSentinelConfig(key) {
    try {
      const tenant = await this.findByKey(key);
      
      if (!tenant || !tenant.isActive) {
        return null;
      }
      
      // Only return if all required Sentinel fields are present
      if (tenant.tenantId && tenant.clientId && tenant.clientSecret && 
          tenant.subscriptionId && tenant.resourceGroup && tenant.workspaceName) {
        return {
          key: tenant.key,
          displayName: tenant.displayName,
          tenantId: tenant.tenantId,
          clientId: tenant.clientId,
          clientSecret: tenant.clientSecret,
          subscriptionId: tenant.subscriptionId,
          resourceGroup: tenant.resourceGroup,
          workspaceName: tenant.workspaceName,
          ownerEmail: tenant.ownerEmail,
          ownerUPN: tenant.ownerUPN,
          ownerObjectId: tenant.ownerObjectId,
          ownerName: tenant.ownerName,
          autoAssignIncidents: tenant.autoAssignIncidents
        };
      }
      
      return null;
    } catch (error) {
      console.error('[TenantRepository] Error getting Sentinel config:', error);
      throw error;
    }
  }

  // Check if tenant exists and is active
  async isActive(key) {
    try {
      const tenant = await this.getCollection().findOne(
        { key, isActive: true },
        { projection: { _id: 1 } }
      );
      
      return !!tenant;
    } catch (error) {
      console.error('[TenantRepository] Error checking tenant active status:', error);
      throw error;
    }
  }
}

// Create singleton instance
const tenantRepository = new TenantRepository();
export default tenantRepository;
