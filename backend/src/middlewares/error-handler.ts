import { NextFunction, Request, Response } from 'express';
import { logger } from '../services/logger-service';
import { CustomError } from '../errors/custom-error';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ name: err.name, message: err.message, stack: err.stack, req, res });
  if (err instanceof CustomError) {
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }
  return res.status(400).send({ errors: [{ message: 'Something went wrong!' }] });
};
