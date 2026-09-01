import cors from 'cors';
import { config } from '../config';

export const corsMiddleware = cors({
  origin: config.frontendUrl,
  credentials: true,
});
