import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';
import { config } from '../config';

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof AppError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Internal server error';

  if (status >= 500) {
    logger.error(`${req.method} ${req.path} ->`, error);
  } else {
    logger.warn(`${req.method} ${req.path} -> ${status} ${message}`);
  }

  res.status(status).json({
    error: message,
    ...(config.nodeEnv === 'development' && error instanceof Error && { stack: error.stack }),
  });
}
