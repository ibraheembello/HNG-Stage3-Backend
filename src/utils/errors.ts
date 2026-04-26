export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code: ErrorCode = 'BAD_REQUEST',
    public details: unknown = null
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errors = {
  badRequest: (message: string, details: unknown = null) =>
    new AppError(message, 400, 'BAD_REQUEST', details),
  unauthorized: (message = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Insufficient permissions') =>
    new AppError(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Resource not found') =>
    new AppError(message, 404, 'NOT_FOUND'),
  conflict: (message: string) => new AppError(message, 409, 'CONFLICT'),
  unprocessable: (message = 'Invalid parameter type', details: unknown = null) =>
    new AppError(message, 422, 'UNPROCESSABLE_ENTITY', details),
  tooMany: (message = 'Too many requests') =>
    new AppError(message, 429, 'TOO_MANY_REQUESTS'),
  internal: (message = 'Internal server error') =>
    new AppError(message, 500, 'INTERNAL_ERROR'),
};
