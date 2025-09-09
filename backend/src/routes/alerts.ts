import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { authenticateToken, authenticate, requireScopes } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest, Alert, ValidationError, NotFoundError } from '../types';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Simulate alert endpoint (for demo purposes)
 * POST /api/alerts/simulate
 */
router.post('/simulate', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { 
    type = 'flood', 
    severity = 'high', 
    location = 'Indore, MP', 
    description = 'Heavy rainfall causing flooding in low-lying areas',
    affectedPopulation = 50000,
    resourcesNeeded = ['rescue_boats', 'medical_supplies', 'food_packets']
  } = req.body;

  const alertId = uuidv4();

  // Mock alert data for demo
  const alertData = {
    id: alertId,
    type,
    severity,
    title: `${type.toUpperCase()} Alert - ${location}`,
    description,
    location: {
      address: location,
      coordinates: { lat: 22.7196, lng: 75.8577 } // Indore coordinates
    },
    affectedPopulation,
    resourcesNeeded,
    source: 'simulation',
    status: 'active',
    created_at: new Date().toISOString(),
    risk_level: severity.toUpperCase(),
    estimated_impact: `${affectedPopulation} people affected`,
    response_required: true
  };

  // Log the simulation
  logger.info(`Alert simulated: ${alertId} - ${type} (${severity}) at ${location}`);

  res.status(201).json({
    success: true,
    data: alertData,
    message: 'Alert simulated successfully. Multi-agent workflow initiated.',
    timestamp: new Date().toISOString()
  });
}));

/**
 * Original simulate endpoint with validation
 * POST /api/alerts/simulate-full
 */
router.post('/simulate-full', [
  body('type').isIn(['flood', 'fire', 'earthquake', 'storm', 'medical', 'security']),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('title').isLength({ min: 1, max: 500 }),
  body('description').optional().isLength({ max: 2000 }),
  body('location').isObject(),
  body('location.address').isLength({ min: 1, max: 500 }),
  body('location.coordinates').optional().isObject(),
  body('location.coordinates.lat').optional().isFloat({ min: -90, max: 90 }),
  body('location.coordinates.lng').optional().isFloat({ min: -180, max: 180 }),
], authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Invalid alert data', errors.array());
  }

  const { type, severity, title, description, location, metadata } = req.body;
  const alertId = uuidv4();

  // Insert alert into database
  const alertData = {
    id: alertId,
    type,
    severity,
    title,
    description: description || '',
    location_address: location.address,
    location_lat: location.coordinates?.lat || null,
    location_lng: location.coordinates?.lng || null,
    metadata: JSON.stringify(metadata || {}),
    source: 'simulation',
    status: 'active'
  };

  await query(`
    INSERT INTO alerts (id, type, severity, title, description, location_address, location_lat, location_lng, metadata, source, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    alertData.id,
    alertData.type,
    alertData.severity,
    alertData.title,
    alertData.description,
    alertData.location_address,
    alertData.location_lat,
    alertData.location_lng,
    alertData.metadata,
    alertData.source,
    alertData.status
  ]);

  // Log audit event (commented out for demo mode)
  // logAuditEvent({
  //   actor: req.auth?.claims.sub || 'anonymous',
  //   action: 'alert.simulate',
  //   resource: `alert:${alertId}`,
  //   result: 'success',
  //   details: { type, severity, location: location.address }
  // });

  logger.info(`Alert simulated: ${alertId} - ${type} (${severity}) at ${location.address}`);

  // TODO: Trigger alert processing workflow
  // This would normally trigger the Alert Agent to process the new alert

  res.status(201).json({
    success: true,
    data: {
      id: alertId,
      type,
      severity,
      title,
      description,
      location,
      source: 'simulation',
      status: 'active',
      created_at: new Date().toISOString()
    },
    message: 'Alert simulated successfully. Processing workflow initiated.',
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get all alerts
 * GET /api/alerts
 */
router.get('/', authenticate, requireScopes(['alert.read', 'admin.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const offset = (page - 1) * limit;
  const status = req.query.status as string;
  const type = req.query.type as string;
  const severity = req.query.severity as string;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  if (status) {
    whereClause += ` AND status = $${++paramCount}`;
    params.push(status);
  }

  if (type) {
    whereClause += ` AND type = $${++paramCount}`;
    params.push(type);
  }

  if (severity) {
    whereClause += ` AND severity = $${++paramCount}`;
    params.push(severity);
  }

  // Get total count
  const countResult = await query(`
    SELECT COUNT(*) as total FROM alerts ${whereClause}
  `, params);
  const total = parseInt(countResult.rows[0].total);

  // Get alerts
  const alertsResult = await query(`
    SELECT id, type, severity, title, description, location_address, location_lat, location_lng, 
           metadata, source, status, created_at, updated_at
    FROM alerts 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, [...params, limit, offset]);

  const alerts = alertsResult.rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    location: {
      address: row.location_address,
      coordinates: row.location_lat && row.location_lng ? {
        lat: parseFloat(row.location_lat),
        lng: parseFloat(row.location_lng)
      } : null
    },
    metadata: row.metadata,
    source: row.source,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));

  res.json({
    success: true,
    data: alerts,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get alert by ID
 * GET /api/alerts/:id
 */
router.get('/:id', authenticate, requireScopes(['alert.read', 'admin.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(`
    SELECT id, type, severity, title, description, location_address, location_lat, location_lng, 
           metadata, source, status, created_at, updated_at
    FROM alerts 
    WHERE id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError(`Alert with ID ${id} not found`);
  }

  const row = result.rows[0];
  const alert = {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    location: {
      address: row.location_address,
      coordinates: row.location_lat && row.location_lng ? {
        lat: parseFloat(row.location_lat),
        lng: parseFloat(row.location_lng)
      } : null
    },
    metadata: row.metadata,
    source: row.source,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };

  res.json({
    success: true,
    data: alert,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Update alert status
 * PATCH /api/alerts/:id/status
 */
router.patch('/:id/status', [
  body('status').isIn(['active', 'processing', 'resolved', 'cancelled'])
], authenticate, requireScopes(['alert.write', 'admin.write']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Invalid status', errors.array());
  }

  const { id } = req.params;
  const { status } = req.body;

  // Check if alert exists
  const existingAlert = await query('SELECT id, status FROM alerts WHERE id = $1', [id]);
  if (existingAlert.rows.length === 0) {
    throw new NotFoundError(`Alert with ID ${id} not found`);
  }

  // Update status
  await query('UPDATE alerts SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

  // Log audit event (commented out for demo mode)
  // logAuditEvent({
  //   actor: req.auth!.claims.sub,
  //   action: 'alert.status_update',
  //   resource: `alert:${id}`,
  //   result: 'success',
  //   details: { status }
  // });

  res.json({
    success: true,
    data: {
      id,
      status,
      updated_at: new Date().toISOString()
    },
    message: 'Alert status updated successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get alert statistics
 * GET /api/alerts/stats
 */
router.get('/stats', authenticate, requireScopes(['alert.read', 'admin.read']), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const timeframe = req.query.timeframe as string || '24h';
  
  let timeCondition = '';
  switch (timeframe) {
    case '1h':
      timeCondition = "created_at >= NOW() - INTERVAL '1 hour'";
      break;
    case '24h':
      timeCondition = "created_at >= NOW() - INTERVAL '24 hours'";
      break;
    case '7d':
      timeCondition = "created_at >= NOW() - INTERVAL '7 days'";
      break;
    case '30d':
      timeCondition = "created_at >= NOW() - INTERVAL '30 days'";
      break;
    default:
      timeCondition = "created_at >= NOW() - INTERVAL '24 hours'";
  }

  // Get statistics
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_alerts,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_alerts,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
      COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
      COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_alerts,
      COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_alerts
    FROM alerts 
    WHERE ${timeCondition}
  `);

  const typeStatsResult = await query(`
    SELECT type, COUNT(*) as count
    FROM alerts 
    WHERE ${timeCondition}
    GROUP BY type
    ORDER BY count DESC
  `);

  const stats = {
    timeframe,
    total_alerts: parseInt(statsResult.rows[0].total_alerts),
    by_status: {
      active: parseInt(statsResult.rows[0].active_alerts),
      processing: parseInt(statsResult.rows[0].processing_alerts),
      resolved: parseInt(statsResult.rows[0].resolved_alerts)
    },
    by_severity: {
      critical: parseInt(statsResult.rows[0].critical_alerts),
      high: parseInt(statsResult.rows[0].high_alerts),
      medium: parseInt(statsResult.rows[0].medium_alerts),
      low: parseInt(statsResult.rows[0].low_alerts)
    },
    by_type: typeStatsResult.rows.reduce((acc: any, row: any) => {
      acc[row.type] = parseInt(row.count);
      return acc;
    }, {})
  };

  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
}));

export default router;