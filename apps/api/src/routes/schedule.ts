import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toClassSessionDto } from '../lib/dto.js';

export const scheduleRouter = Router();

const includeTrainer = { trainer: { include: { user: true } } } as const;

// GET /schedule — student: their cohort/track's classes; trainer: classes they teach.
scheduleRouter.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    if (req.user!.role === 'student') {
      const student = await prisma.student.findUniqueOrThrow({
        where: { userId: req.user!.id },
      });
      const sessions = await prisma.classSession.findMany({
        where: { cohort: student.cohort, track: student.track },
        include: includeTrainer,
        orderBy: { scheduledStartAt: 'asc' },
      });
      return res.json(sessions.map(toClassSessionDto));
    }

    if (req.user!.role === 'trainer') {
      const trainer = await prisma.trainer.findUniqueOrThrow({
        where: { userId: req.user!.id },
      });
      const sessions = await prisma.classSession.findMany({
        where: { trainerId: trainer.id },
        include: includeTrainer,
        orderBy: { scheduledStartAt: 'asc' },
      });
      return res.json(sessions.map(toClassSessionDto));
    }

    // Admin: all sessions.
    const sessions = await prisma.classSession.findMany({
      include: includeTrainer,
      orderBy: { scheduledStartAt: 'asc' },
    });
    res.json(sessions.map(toClassSessionDto));
  }),
);

// GET /classes/:id
scheduleRouter.get(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const session = await prisma.classSession.findUnique({
      where: { id: req.params.id },
      include: includeTrainer,
    });
    if (!session) throw new HttpApiError('not_found', 'Class not found.');

    // Authorization: a student may only view classes for their own cohort/track;
    // a trainer only their own sessions. Admin sees everything.
    if (req.user!.role === 'student') {
      const student = await prisma.student.findUniqueOrThrow({
        where: { userId: req.user!.id },
      });
      if (session.cohort !== student.cohort || session.track !== student.track) {
        throw new HttpApiError('forbidden', 'This class is not on your schedule.');
      }
    } else if (req.user!.role === 'trainer') {
      const trainer = await prisma.trainer.findUniqueOrThrow({
        where: { userId: req.user!.id },
      });
      if (session.trainerId !== trainer.id) {
        throw new HttpApiError('forbidden', 'This class is not assigned to you.');
      }
    }

    res.json(toClassSessionDto(session));
  }),
);
