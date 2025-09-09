import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  }
});
app.use('/api/', limiter);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'CrisisAssist Backend is running',
    mode: 'demo',
    version: '1.0.0'
  });
});

app.get('/api/health/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    services: {
      database: 'demo',
      descope: 'demo',
      external_apis: 'demo'
    }
  });
});

// Demo agent endpoints
app.post('/api/agents/alert/process', (req, res) => {
  const { alertId } = req.body;
  
  logger.info('Processing alert (demo mode)', { alertId });
  
  res.json({
    success: true,
    data: {
      alert_id: alertId || 'demo-alert-001',
      status: 'processed',
      analysis: {
        risk_level: 'high',
        confidence: 0.95,
        recommendations: ['Immediate evacuation', 'Contact emergency services']
      },
      next_steps: ['Schedule coordination meeting', 'Send notifications'],
      processing_time: 1250
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/agents/scheduler/schedule', (req, res) => {
  const { alert_id, title, start_time, end_time } = req.body;
  
  logger.info('Scheduling event (demo mode)', { alert_id, title });
  
  res.json({
    success: true,
    data: {
      event_id: `demo-event-${Date.now()}`,
      calendar_event_id: `cal-${Date.now()}`,
      title: title || 'Emergency Response Coordination',
      start_time: start_time || new Date(Date.now() + 3600000).toISOString(),
      end_time: end_time || new Date(Date.now() + 7200000).toISOString(),
      location: 'Emergency Operations Center',
      attendees: ['coordinator@crisisassist.com', 'responder@crisisassist.com'],
      status: 'scheduled'
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/agents/notifier/send', (req, res) => {
  const { channel_type, recipients, message, priority } = req.body;
  
  logger.info('Sending notification (demo mode)', { channel_type, recipients: recipients?.length });
  
  res.json({
    success: true,
    data: {
      message_id: `demo-msg-${Date.now()}`,
      channel_type: channel_type || 'slack',
      recipients_count: recipients?.length || 1,
      sent_count: recipients?.length || 1,
      failed_count: 0,
      status: 'sent',
      delivery_results: recipients?.map((recipient: string) => ({
        recipient,
        status: 'delivered',
        timestamp: new Date().toISOString()
      })) || [{ recipient: 'demo@example.com', status: 'delivered', timestamp: new Date().toISOString() }]
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/agents/verifier/verify', (req, res) => {
  const { content, content_type } = req.body;
  
  logger.info('Verifying content (demo mode)', { content_type });
  
  res.json({
    success: true,
    data: {
      verification_id: `demo-verify-${Date.now()}`,
      content_hash: 'sha256:demo-hash-' + Date.now(),
      verified: true,
      risk_score: 15,
      verification_checks: [
        { rule: 'content_authenticity', passed: true, confidence: 0.98 },
        { rule: 'source_reliability', passed: true, confidence: 0.92 },
        { rule: 'misinformation_detection', passed: true, confidence: 0.89 }
      ],
      signature: 'demo-signature-' + Date.now(),
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

// Demo alerts endpoints
app.get('/api/alerts', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'demo-alert-001',
        type: 'earthquake',
        severity: 'high',
        title: 'Earthquake Alert - Magnitude 6.2',
        description: 'Strong earthquake detected in downtown area. Immediate response required.',
        location_address: '123 Main St, Downtown',
        status: 'active',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'demo-alert-002',
        type: 'flood',
        severity: 'critical',
        title: 'Flash Flood Warning',
        description: 'Severe flooding in residential areas. Evacuation may be necessary.',
        location_address: '456 River Rd, Riverside District',
        status: 'active',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      total_pages: 1
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/alerts', (req, res) => {
  const { type, severity, title, description, location_address } = req.body;
  
  logger.info('Creating alert (demo mode)', { type, severity, title });
  
  res.json({
    success: true,
    data: {
      id: `demo-alert-${Date.now()}`,
      type,
      severity,
      title,
      description,
      location_address,
      status: 'pending',
      created_at: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

// Demo workflow endpoint
app.post('/api/workflow/emergency-response', (req, res) => {
  const { alert_id, workflow_type } = req.body;
  
  logger.info('Starting emergency response workflow (demo mode)', { alert_id, workflow_type });
  
  res.json({
    success: true,
    data: {
      workflow_id: `demo-workflow-${Date.now()}`,
      alert_id: alert_id || 'demo-alert-001',
      workflow_type: workflow_type || 'standard_emergency',
      status: 'in_progress',
      steps: [
        { step: 'alert_processing', status: 'completed', agent: 'AlertAgent' },
        { step: 'content_verification', status: 'completed', agent: 'VerifierAgent' },
        { step: 'event_scheduling', status: 'in_progress', agent: 'SchedulerAgent' },
        { step: 'notification_sending', status: 'pending', agent: 'NotifierAgent' }
      ],
      estimated_completion: new Date(Date.now() + 300000).toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 CrisisAssist Demo Server started successfully`);
  logger.info(`📍 Server running on port ${PORT}`);
  logger.info(`🔧 Demo mode: ENABLED`);
  logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🧪 API endpoints: http://localhost:${PORT}/api/`);
  console.log(`✅ CrisisAssist Backend Demo Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔄 Multi-agent workflow: http://localhost:${PORT}/api/workflow/emergency-response`);
});
