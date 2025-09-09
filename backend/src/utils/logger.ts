import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logAuditEvent = (event: {
  actor: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details?: any;
}) => {
  logger.info('AUDIT_EVENT', {
    type: 'audit',
    ...event,
    timestamp: new Date().toISOString()
  });
};

export const logSecurityEvent = (event: {
  type: 'auth_failure' | 'token_validation' | 'scope_violation' | 'suspicious_activity';
  details: any;
}) => {
  logger.warn('SECURITY_EVENT', {
    ...event,
    timestamp: new Date().toISOString()
  });
};

export const logAgentActivity = (activity: {
  agentId: string;
  agentType: string;
  action: string;
  input?: any;
  output?: any;
  duration?: number;
  success: boolean;
  error?: string;
}) => {
  logger.info('AGENT_ACTIVITY', {
    type: 'agent_activity',
    ...activity,
    timestamp: new Date().toISOString()
  });
};

export const logExternalApiCall = (call: {
  service: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  success: boolean;
  error?: string;
}) => {
  const logLevel = call.success ? 'info' : 'error';
  
  logger[logLevel]('EXTERNAL_API_CALL', {
    type: 'external_api',
    ...call,
    timestamp: new Date().toISOString()
  });
};

// Export default logger
export default logger;