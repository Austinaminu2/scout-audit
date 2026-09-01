import { Request } from 'express';
import { AuthUser } from './user';

export interface AuthRequest extends Request {
  user?: AuthUser;
}
