/**
 * Error handler service for managing API errors consistently
 */

// Base API error class
export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }

  public toJSON() {
    return {
      error: {
        message: this.message,
        code: this.errorCode,
        details: this.details,
      },
    };
  }
}

// Specialized errors
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', errorCode: string = 'BAD_REQUEST', details?: any) {
    super(message, 400, errorCode, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', errorCode: string = 'UNAUTHORIZED', details?: any) {
    super(message, 401, errorCode, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', errorCode: string = 'FORBIDDEN', details?: any) {
    super(message, 403, errorCode, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', errorCode: string = 'NOT_FOUND', details?: any) {
    super(message, 404, errorCode, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', errorCode: string = 'CONFLICT', details?: any) {
    super(message, 409, errorCode, details);
  }
}

// OIDC specific errors
export class OidcError extends ApiError {
  constructor(message: string, errorCode: string = 'OIDC_ERROR', details?: any) {
    super(message, 400, errorCode, details);
  }
}

export class OidcProviderError extends OidcError {
  constructor(message: string = 'Invalid OIDC provider', details?: any) {
    super(message, 'OIDC_PROVIDER_ERROR', details);
  }
}

export class OidcDiscoveryError extends OidcError {
  constructor(message: string = 'OIDC discovery failed', details?: any) {
    super(message, 'OIDC_DISCOVERY_ERROR', details);
  }
}

export class OidcStateError extends OidcError {
  constructor(message: string = 'Invalid OIDC state', details?: any) {
    super(message, 'OIDC_STATE_ERROR', details);
  }
}

export class OidcTokenError extends OidcError {
  constructor(message: string = 'Error obtaining OIDC tokens', details?: any) {
    super(message, 'OIDC_TOKEN_ERROR', details);
  }
}

export class OidcUserInfoError extends OidcError {
  constructor(message: string = 'Error obtaining user info', details?: any) {
    super(message, 'OIDC_USERINFO_ERROR', details);
  }
}

// Error handler middleware
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error('API Error:', err);

  // Handle ApiError types
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle validation errors (e.g., from Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        message: 'Authentication error',
        code: 'AUTH_ERROR',
        details: err.message,
      },
    });
  }

  // Default error handler
  return res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
};