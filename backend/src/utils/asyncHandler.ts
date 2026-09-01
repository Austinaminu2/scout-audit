import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler<T extends Request = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

// Forwards rejected promises from async route handlers to Express's error
// middleware instead of requiring a try/catch in every route.
export function asyncHandler<T extends Request = Request>(handler: AsyncRouteHandler<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as T, res, next)).catch(next);
  };
}
