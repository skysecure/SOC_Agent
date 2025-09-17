import { ObjectId } from 'mongodb';
import database, { dbConfig } from '../services/db.js';

class IncidentRepository {
  constructor() {
    this.collectionName = dbConfig.collections.incidents;
  }

  getCollection() {
    return database.getCollection(this.collectionName);
  }

  async create(incident) {
    try {
      const doc = {
        ...incident,
        legacyId: incident.id, // Preserve existing ID for backward compatibility
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Remove the old id field to avoid confusion
      delete doc.id;
      
      const result = await this.getCollection().insertOne(doc);
      return { ...doc, _id: result.insertedId, id: result.insertedId.toString() };
    } catch (error) {
      console.error('[IncidentRepository] Error creating incident:', error);
      throw error;
    }
  }

  async findAll({ tenantKey, status, severity, limit = 100, skip = 0 } = {}) {
    try {
      const filter = {};
      
      if (tenantKey && tenantKey !== 'ALL') {
        filter['tenant.key'] = tenantKey;
      }
      if (status) {
        filter.status = status;
      }
      if (severity) {
        filter.severity = severity;
      }
      
      const incidents = await this.getCollection()
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();
      
      // Convert _id to id for backward compatibility
      return incidents.map(inc => ({
        ...inc,
        id: inc._id.toString()
      }));
    } catch (error) {
      console.error('[IncidentRepository] Error finding incidents:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      let incident;
      
      // Try MongoDB _id first
      if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
        incident = await this.getCollection().findOne({ _id: new ObjectId(id) });
      }
      
      // Fall back to legacy ID
      if (!incident) {
        incident = await this.getCollection().findOne({ legacyId: id });
      }
      
      if (incident) {
        return {
          ...incident,
          id: incident._id.toString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('[IncidentRepository] Error finding incident by ID:', error);
      throw error;
    }
  }

  async updateStatus(id, status) {
    try {
      const update = {
        $set: {
          status,
          updatedAt: new Date(),
          ...(status === 'Closed' && { closedAt: new Date() })
        }
      };
      
      let result;
      
      // Try MongoDB _id first
      if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
        result = await this.getCollection().updateOne(
          { _id: new ObjectId(id) },
          update
        );
      }
      
      // Fall back to legacy ID if no match
      if (!result || result.matchedCount === 0) {
        result = await this.getCollection().updateOne(
          { legacyId: id },
          update
        );
      }
      
      return result;
    } catch (error) {
      console.error('[IncidentRepository] Error updating incident status:', error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const { _id, ...updateData } = updates;
      
      const update = {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      };
      
      let result;
      
      // Try MongoDB _id first
      if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
        result = await this.getCollection().updateOne(
          { _id: new ObjectId(id) },
          update
        );
      }
      
      // Fall back to legacy ID if no match
      if (!result || result.matchedCount === 0) {
        result = await this.getCollection().updateOne(
          { legacyId: id },
          update
        );
      }
      
      return result;
    } catch (error) {
      console.error('[IncidentRepository] Error updating incident:', error);
      throw error;
    }
  }

  async deleteById(id) {
    try {
      let result;
      
      // Try MongoDB _id first
      if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
        result = await this.getCollection().deleteOne({ _id: new ObjectId(id) });
      }
      
      // Fall back to legacy ID if no match
      if (!result || result.deletedCount === 0) {
        result = await this.getCollection().deleteOne({ legacyId: id });
      }
      
      return result;
    } catch (error) {
      console.error('[IncidentRepository] Error deleting incident:', error);
      throw error;
    }
  }

  async count(filter = {}) {
    try {
      return await this.getCollection().countDocuments(filter);
    } catch (error) {
      console.error('[IncidentRepository] Error counting incidents:', error);
      throw error;
    }
  }

  async getStatistics(tenantKey) {
    try {
      const match = tenantKey && tenantKey !== 'ALL' 
        ? { 'tenant.key': tenantKey }
        : {};
      
      const pipeline = [
        { $match: match },
        {
          $facet: {
            severityCounts: [
              {
                $group: {
                  _id: '$severity',
                  count: { $sum: 1 }
                }
              }
            ],
            statusCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            totalCount: [
              {
                $count: 'total'
              }
            ],
            avgResponseTime: [
              {
                $group: {
                  _id: null,
                  avg: { $avg: '$responseTime' }
                }
              }
            ]
          }
        }
      ];
      
      const results = await this.getCollection().aggregate(pipeline).toArray();
      return results[0] || {};
    } catch (error) {
      console.error('[IncidentRepository] Error getting statistics:', error);
      throw error;
    }
  }

  // Method to check for duplicate incidents
  async findDuplicates(incidentId, armId) {
    try {
      const filter = {
        $or: [
          { 'originalData.id': incidentId },
          { 'originalData.properties.id': incidentId },
          { 'originalData.name': incidentId }
        ]
      };
      
      if (armId) {
        filter.$or.push({ armId });
      }
      
      return await this.getCollection().find(filter).toArray();
    } catch (error) {
      console.error('[IncidentRepository] Error finding duplicates:', error);
      throw error;
    }
  }

  // Get recent incidents for dashboard
  async getRecentIncidents(limit = 50) {
    try {
      const incidents = await this.getCollection()
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .project({
          id: 1,
          legacyId: 1,
          incidentNumber: 1,
          internalId: 1,
          armId: 1,
          timestamp: 1,
          severity: 1,
          status: 1,
          type: 1,
          executiveSummary: 1,
          affectedUsers: 1,
          responseTime: 1,
          tenant: 1,
          'report.severityAssessment': 1
        })
        .toArray();
      
      return incidents.map(inc => ({
        ...inc,
        id: inc._id.toString()
      }));
    } catch (error) {
      console.error('[IncidentRepository] Error getting recent incidents:', error);
      throw error;
    }
  }
}

// Create singleton instance
const incidentRepository = new IncidentRepository();
export default incidentRepository;
