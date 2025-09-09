import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { 
  CrisisAssistError, 
  AuthenticationError, 
  AuthorizationError, 
  ValidationError, 
  NotFoundError,
  ExternalServiceError 
} from '../types';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle specific error types
  if (error instanceof CrisisAssistError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof AuthenticationError) {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
    message = error.message;
    details = error.details;
  } else if (error instanceof AuthorizationError) {
    statusCode = 403;
    errorCode = 'AUTHORIZATION_ERROR';
    message = error.message;
    details = error.details;
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
    details = error.details;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    errorCode = 'NOT_FOUND_ERROR';
    message = error.message;
    details = error.details;
  } else if (error instanceof ExternalServiceError) {
    statusCode = 502;
    errorCode = 'EXTERNAL_SERVICE_ERROR';
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    // Handle express-validator errors
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    details = undefined;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    },
    timestamp: new Date().toISOString(),
    request_id: req.headers['x-request-id'] || undefined
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.originalUrl} does not exist`
    },
    timestamp: new Date().toISOString()
  });
};