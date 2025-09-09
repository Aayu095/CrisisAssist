 import { Router, Response } from 'express';
import { query } from '../database/connection';
import { authenticateToken, requireScopes } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest, AuditLog } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get audit logs
 * GET /api/audit/logs
 */
router.get('/logs', authenticateToken, requireScopes(['admin.audit.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
  const offset = (page - 1) * limit;
  
  const actorType = req.query.actor_type as string;
  const actorId = req.query.actor_id as string;
  const action = req.query.action as string;
  const resourceType = req.query.resource_type as string;
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  // Build dynamic WHERE clause
  if (actorType) {
    whereClause += ` AND actor_type = $${++paramCount}`;
    params.push(actorType);
  }

  if (actorId) {
    whereClause += ` AND actor_id = $${++paramCount}`;
    params.push(actorId);
  }

  if (action) {
    whereClause += ` AND action ILIKE $${++paramCount}`;
    params.push(`%${action}%`);
  }

  if (resourceType) {
    whereClause += ` AND resource_type = $${++paramCount}`;
    params.push(resourceType);
  }

  if (startDate) {
    whereClause += ` AND timestamp >= $${++paramCount}`;
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ` AND timestamp <= $${++paramCount}`;
    params.push(endDate);
  }

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total FROM audit_logs ${whereClause}
  `, params);
  const total = parseInt(countResult.rows[0].total);

  // Get audit logs
  const logsResult = await query(`
    SELECT id, actor_type, actor_id, action, resource_type, resource_id, 
           token_claims, request_data, response_data, ip_address, user_agent, 
           signature, timestamp
    FROM audit_logs 
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, [...params, limit, offset]);

  const logs = logsResult.rows.map((row: any) => ({
    id: row.id,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    token_claims: row.token_claims,
    request_data: row.request_data,
    response_data: row.response_data,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    signature: row.signature,
    timestamp: row.timestamp
  }));

  res.json({
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1
    },
    filters: {
      actor_type: actorType,
      actor_id: actorId,
      action,
      resource_type: resourceType,
      start_date: startDate,
      end_date: endDate
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get audit log by ID
 * GET /api/audit/logs/:id
 */
router.get('/logs/:id', authenticateToken, requireScopes(['admin.audit.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(`
    SELECT id, actor_type, actor_id, action, resource_type, resource_id, 
           token_claims, request_data, response_data, ip_address, user_agent, 
           signature, timestamp
    FROM audit_logs 
    WHERE id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Audit log with ID ${id} not found`
      },
      timestamp: new Date().toISOString()
    });
  }

  const log = result.rows[0];
  
  return res.json({
    success: true,
    data: {
      id: log.id,
      actor_type: log.actor_type,
      actor_id: log.actor_id,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      token_claims: log.token_claims,
      request_data: log.request_data,
      response_data: log.response_data,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      signature: log.signature,
      timestamp: log.timestamp
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get audit statistics
 * GET /api/audit/stats
 */
router.get('/stats', authenticateToken, requireScopes(['admin.audit.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const timeframe = req.query.timeframe as string || '24h';
  
  let timeCondition = '';
  switch (timeframe) {
    case '1h':
      timeCondition = "timestamp >= NOW() - INTERVAL '1 hour'";
      break;
    case '24h':
      timeCondition = "timestamp >= NOW() - INTERVAL '24 hours'";
      break;
    case '7d':
      timeCondition = "timestamp >= NOW() - INTERVAL '7 days'";
      break;
    case '30d':
      timeCondition = "timestamp >= NOW() - INTERVAL '30 days'";
      break;
    default:
      timeCondition = "timestamp >= NOW() - INTERVAL '24 hours'";
  }

  // Get overall statistics
  const overallStatsResult = await query(`
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT actor_id) as unique_actors,
      COUNT(DISTINCT action) as unique_actions,
      COUNT(DISTINCT resource_type) as unique_resource_types
    FROM audit_logs 
    WHERE ${timeCondition}
  `);

  // Get statistics by actor type
  const actorStatsResult = await query(`
    SELECT actor_type, COUNT(*) as count
    FROM audit_logs 
    WHERE ${timeCondition}
    GROUP BY actor_type
    ORDER BY count DESC
  `);

  // Get statistics by action
  const actionStatsResult = await query(`
    SELECT action, COUNT(*) as count
    FROM audit_logs 
    WHERE ${timeCondition}
    GROUP BY action
    ORDER BY count DESC
    LIMIT 10
  `);

  // Get statistics by resource type
  const resourceStatsResult = await query(`
    SELECT resource_type, COUNT(*) as count
    FROM audit_logs 
    WHERE ${timeCondition}
    GROUP BY resource_type
    ORDER BY count DESC
  `);

  // Get hourly activity (for charts)
  const hourlyStatsResult = await query(`
    SELECT 
      DATE_TRUNC('hour', timestamp) as hour,
      COUNT(*) as count
    FROM audit_logs 
    WHERE ${timeCondition}
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour DESC
    LIMIT 24
  `);

  const stats = {
    timeframe,
    overview: {
      total_events: parseInt(overallStatsResult.rows[0].total_events),
      unique_actors: parseInt(overallStatsResult.rows[0].unique_actors),
      unique_actions: parseInt(overallStatsResult.rows[0].unique_actions),
      unique_resource_types: parseInt(overallStatsResult.rows[0].unique_resource_types)
    },
    by_actor_type: actorStatsResult.rows.reduce((acc: any, row: any) => {
      acc[row.actor_type] = parseInt(row.count);
      return acc;
    }, {}),
    top_actions: actionStatsResult.rows.map((row: any) => ({
      action: row.action,
      count: parseInt(row.count)
    })),
    by_resource_type: resourceStatsResult.rows.reduce((acc: any, row: any) => {
      acc[row.resource_type] = parseInt(row.count);
      return acc;
    }, {}),
    hourly_activity: hourlyStatsResult.rows.map((row: any) => ({
      hour: row.hour,
      count: parseInt(row.count)
    }))
  };

  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get security events (filtered audit logs)
 * GET /api/audit/security
 */
router.get('/security', authenticateToken, requireScopes(['admin.audit.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
  const offset = (page - 1) * limit;
  const severity = req.query.severity as string;

  // Security-related actions
  const securityActions = [
    'authentication',
    'authorization',
    'token_validation',
    'login_failed',
    'access_denied',
    'suspicious_activity',
    'rate_limit_exceeded'
  ];

  let whereClause = `WHERE action = ANY($1)`;
  const params: any[] = [securityActions];
  let paramCount = 1;

  if (severity) {
    // This would require adding a severity field to audit logs
    // For now, we'll filter by action patterns
    const severityActions = {
      'high': ['access_denied', 'suspicious_activity', 'login_failed'],
      'medium': ['authorization', 'rate_limit_exceeded'],
      'low': ['authentication', 'token_validation']
    };
    
    if (severityActions[severity as keyof typeof severityActions]) {
      whereClause = `WHERE action = ANY($1)`;
      params[0] = severityActions[severity as keyof typeof severityActions];
    }
  }

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total FROM audit_logs ${whereClause}
  `, params);
  const total = parseInt(countResult.rows[0].total);

  // Get security events
  const eventsResult = await query(`
    SELECT id, actor_type, actor_id, action, resource_type, resource_id, 
           token_claims, request_data, response_data, ip_address, user_agent, 
           signature, timestamp
    FROM audit_logs 
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, [...params, limit, offset]);

  const events = eventsResult.rows.map((row: any) => ({
    id: row.id,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    token_claims: row.token_claims,
    request_data: row.request_data,
    response_data: row.response_data,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    signature: row.signature,
    timestamp: row.timestamp,
    severity: 'medium' // Default severity since determineSeverity method is not available
  }));

  res.json({
    success: true,
    data: events,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1
    },
    filters: {
      severity
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get agent activity logs
 * GET /api/audit/agents
 */
router.get('/agents', authenticateToken, requireScopes(['admin.audit.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
  const offset = (page - 1) * limit;
  const agentType = req.query.agent_type as string;

  let whereClause = "WHERE actor_type = 'agent'";
  const params: any[] = [];
  let paramCount = 0;

  if (agentType) {
    whereClause += ` AND actor_id LIKE $${++paramCount}`;
    params.push(`agent_${agentType}_%`);
  }

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total FROM audit_logs ${whereClause}
  `, params);
  const total = parseInt(countResult.rows[0].total);

  // Get agent activity logs
  const logsResult = await query(`
    SELECT id, actor_id, action, resource_type, resource_id, 
           token_claims, request_data, response_data, timestamp
    FROM audit_logs 
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, [...params, limit, offset]);

  const logs = logsResult.rows.map((row: any) => ({
    id: row.id,
    agent_id: row.actor_id,
    agent_type: row.actor_id.split('_')[1], // Extract type from agent_type_id format
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    token_claims: row.token_claims,
    request_data: row.request_data,
    response_data: row.response_data,
    timestamp: row.timestamp
  }));

  res.json({
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1
    },
    filters: {
      agent_type: agentType
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Helper function to determine severity of security events
 */
function determineSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'suspicious_activity': 'critical',
    'access_denied': 'high',
    'login_failed': 'high',
    'rate_limit_exceeded': 'medium',
    'authorization': 'medium',
    'authentication': 'low',
    'token_validation': 'low'
  };

  return severityMap[action] || 'medium';
}

export default router;