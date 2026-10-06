import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toUserDto, toStudentDto, toTrainerDto } from '../lib/dto.js';

export const meRouter = Router();

meRouter.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpApiError('not_found', 'User not found.');

    if (user.role === 'student') return res.json(await toStudentDto(user.id));
    if (user.role === 'trainer') return res.json(await toTrainerDto(user.id));
    return res.json(await toUserDto(user));
  }),
);
