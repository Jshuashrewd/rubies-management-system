import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { HttpApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

// Express doesn't know about our custom `req.user` field by default —
// this augments the Request type so route handlers get autocomplete/safety.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'student' | 'trainer' | 'admin';
      };
    }
  }
}

/**
 * Requires a valid `Authorization: Bearer <jwt>` header. Attaches
 * `req.user` on success. Any failure throws `unauthorized`, which the
 * client's `onUnauthorized()` uses to force logout — this is the ONE
 * error code allowed to mean "your session is invalid", so don't reuse
 * it for anything else.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new HttpApiError('unauthorized', 'Missing or malformed Authorization header.');
  }

  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpApiError('unauthorized', 'Invalid or expired token.');
  }

  // Re-check the user still exists on every request rather than trusting
  // the token blindly — cheap insurance against a deleted/deactivated
  // account still holding a valid-looking JWT.
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new HttpApiError('unauthorized', 'User no longer exists.');
  }

  req.user = { id: user.id, role: user.role };
  next();
}

/** Use after requireAuth to restrict a route to specific roles. */
export function requireRole(...roles: Array<'student' | 'trainer' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpApiError('forbidden', 'You do not have access to this resource.');
    }
    next();
  };
}
