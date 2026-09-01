import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthRequest } from '../types';
import { UnauthorizedError } from '../utils/errors';

function extractToken(req: AuthRequest): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

export function validateAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return next(new UnauthorizedError('No token provided'));
  }

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.userId, githubId: decoded.githubId };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

// Populates req.user when a valid token is present but never rejects the
// request — for routes that behave differently for signed-in users without
// requiring sign-in.
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = { id: decoded.userId, githubId: decoded.githubId };
    } catch {
      // Invalid token on an optional route just means "not signed in".
    }
  }

  next();
}
