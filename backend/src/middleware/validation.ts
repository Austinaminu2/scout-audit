import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

// Validates { params, query, body } against a schema and rejects with a 400
// before the request reaches a controller, instead of letting bad input
// blow up as an unhandled DB/500 error further down.
export const validate = (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({ params: req.params, query: req.query, body: req.body });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new BadRequestError(error.errors.map((e) => e.message).join(', ')));
      }
      next(error);
    }
  };
