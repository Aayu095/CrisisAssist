import { Request } from 'express';

// Descope JWT Claims
export interface DescopeJWTClaims {
  sub: string; // Subject (agent ID or user ID)
  iss: string; // Issuer
  aud: string; // Audience
  exp: number; // Expiration time
  iat: number; // Issued at
  jti: string; // JWT ID
  azp?: string; // Authorized party (client ID)
  scope?: string; // Scopes (space-separated)
  agent_id?: string; // Agent identifier
  agent_type?: string; // Agent type (alert, scheduler, etc.)
  user_id?: string; // User ID for delegated tokens
  delegation?: {
    delegator: string;
    delegatee: string;
    consent_id: string;
    granted_at: number;
  };
}

// Extended Express Request with auth context
export interface AuthenticatedRequest extends Request {
  auth?: {
    claims: DescopeJWTClaims;
    token: string;
    scopes: string[];
    agentId?: string;
    userId?: string;
    sessionToken?: string; // For backward compatibility
  };
}

// Alert Types
export interface Alert {
  id: string;
  type: 'flood' | 'fire' | 'earthquake' | 'storm' | 'medical' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  metadata?: Record<string, any>;
  source: string;
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'processing' | 'resolved' | 'cancelled';
}

// Event Types (Calendar/Scheduling)
export interface Event {
  id: string;
  alert_id: string;
  title: string;
  description: string;
  start_time: Date;
  end_time: Date;
  location: string;
  assignees: string[];
  resources: string[];
  calendar_event_id?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

// Message Types
export interface Message {
  id: string;
  event_id?: string;
  alert_id?: string;
  channel_type: 'slack' | 'sms' | 'email' | 'whatsapp';
  channel_id: string;
  recipient: string;
  subject?: string;
  content: string;
  message_id?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  actor_type: 'agent' | 'user' | 'system';
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  token_claims?: DescopeJWTClaims;
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  signature?: string;
  timestamp: Date;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  type: 'alert' | 'scheduler' | 'notifier' | 'verifier';
  description: string;
  allowed_scopes: string[];
  public_key?: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: Date;
  updated_at: Date;
}

// User Types
export interface User {
  id: string;
  descope_user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'operator' | 'volunteer' | 'citizen';
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

// Verification Types
export interface VerificationResult {
  verified: boolean;
  signature: string;
  verifier_id: string;
  verification_data: {
    content_hash: string;
    timestamp: Date;
    rules_applied: string[];
    risk_score: number;
  };
  errors?: string[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  request_id?: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// External API Types
export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string;
}

export interface TwilioMessage {
  to: string;
  from: string;
  body: string;
  mediaUrl?: string[];
}

// Configuration Types
export interface DescopeConfig {
  projectId: string;
  managementKey: string;
  inboundClientId: string;
  inboundClientSecret: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

// Workflow Types
export interface WorkflowStep {
  id: string;
  name: string;
  agent_type: string;
  required_scopes: string[];
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  timeout_ms: number;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  alert_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  steps: Array<{
    step_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    started_at?: Date;
    completed_at?: Date;
    input?: Record<string, any>;
    output?: Record<string, any>;
    error?: string;
  }>;
  created_at: Date;
  updated_at: Date;
}

// Error Types
export class CrisisAssistError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'CrisisAssistError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthenticationError extends CrisisAssistError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends CrisisAssistError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends CrisisAssistError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends CrisisAssistError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'NOT_FOUND_ERROR', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ExternalServiceError extends CrisisAssistError {
  constructor(message: string = 'External service error', details?: any) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.name = 'ExternalServiceError';
  }
}