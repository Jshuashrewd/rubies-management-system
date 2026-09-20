import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail loudly at boot, not on the first request — a missing secret is a
    // deploy-config bug, and signing tokens with `undefined` would silently
    // produce insecure tokens.
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  }
  return secret;
}

export interface JwtPayload {
  userId: string;
  role: 'student' | 'trainer' | 'admin';
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
