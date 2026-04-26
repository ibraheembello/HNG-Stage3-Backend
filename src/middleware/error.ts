import { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  // Log unexpected errors via the request logger if present
  const reqLog = (req as unknown as { log?: { error: (...args: unknown[]) => void } }).log;
  if (reqLog) reqLog.error({ err }, 'unhandled error');
  else console.error(err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: null,
    },
  });
};

export const notFoundHandler = (
  _req: import('express').Request,
  res: import('express').Response
) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found', details: null },
  });
};
