import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { HttpApiError } from '../lib/errors.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { toUserDto } from '../lib/dto.js';

export const authRouter = Router();

const loginSchema = z.object({
  schoolId: z.string().min(1),
  password: z.string().min(1),
});

// POST /auth/login — matches LoginRequest -> LoginResponse in types.ts
authRouter.post(
  '/login',
  asyncRoute(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError('validation_error', 'schoolId and password are required.');
    }
    const { schoolId, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { schoolId } });

    // Deliberately identical error for "no such ID" and "wrong password" —
    // distinguishing them lets an attacker enumerate valid School IDs.
    if (!user) {
      throw new HttpApiError('invalid_credentials', 'Incorrect School ID or password.');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new HttpApiError('invalid_credentials', 'Incorrect School ID or password.');
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: await toUserDto(user),
      mustChangePassword: user.mustChangePassword,
    });
  }),
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
});

// POST /auth/change-password — requires auth; matches ChangePasswordRequest -> ChangePasswordResponse
authRouter.post(
  '/change-password',
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError(
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid request.',
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

    const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new HttpApiError('invalid_credentials', 'Current password is incorrect.');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    res.json({ success: true });
  }),
);
