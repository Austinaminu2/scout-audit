import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  githubId: number;
}

export function signToken(payload: JwtPayload): string {
  // @types/jsonwebtoken types expiresIn as a branded "ms"-style string
  // literal; JWT_EXPIRES_IN comes from an env var so it's only known to be
  // a plain string at compile time.
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
