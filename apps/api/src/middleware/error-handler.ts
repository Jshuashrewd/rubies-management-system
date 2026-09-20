import type { NextFunction, Request, Response } from 'express';
import { HttpApiError } from '../lib/errors.js';

/**
 * Central error handler. Route handlers can `throw new HttpApiError(...)`
 * (sync or inside an async handler wrapped by `asyncRoute`) and it lands
 * here, guaranteeing every error response uses the ApiErrorBody envelope
 * the client expects. Never let a raw Error/stack trace reach the client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpApiError) {
    res.status(err.status).json(err.toBody());
    return;
  }

  // Anything else is a bug — log the real error server-side, but never
  // leak internal details (stack traces, DB errors) to the client.
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { code: 'server_error', message: 'Something went wrong.' },
  });
}

/**
 * Wrap async Express handlers so a rejected promise reaches the error
 * handler above instead of crashing the process / hanging the request.
 * Express 4 does not do this automatically for async functions.
 */
export function asyncRoute(
  // Route handlers commonly `return res.json(...)` as a shorthand for
  // "send and stop here" — that return value is unused, so we accept
  // Promise<unknown> rather than forcing every handler to end with a
  // bare `res.json(...);` statement instead of `return res.json(...)`.
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
