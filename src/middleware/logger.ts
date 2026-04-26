import pinoHttp from 'pino-http';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

const baseLogger = pino({ level: env.LOG_LEVEL });

export const requestLogger = pinoHttp({
  logger: baseLogger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = (typeof existing === 'string' && existing) || randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

export const log = baseLogger;
