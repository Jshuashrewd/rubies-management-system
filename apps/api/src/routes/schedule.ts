import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { classSessionInclude, toClassSessionDto } from '../lib/dto.js';

export const scheduleRouter = Router();

// GET /schedule — student: sessions their ClassSchedule links include them
// on; trainer: sessions on ClassSchedules they teach; admin: everything.
scheduleRouter.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    if (req.user!.role === 'student') {
      const sessions = await prisma.classSession.findMany({
        where: { classSchedule: { students: { some: { studentId: req.user!.id } } } },
        include: classSessionInclude,
        orderBy: { scheduledStartAt: 'asc' },
      });
      return res.json(sessions.map(toClassSessionDto));
    }

    if (req.user!.role === 'trainer') {
      const trainer = await prisma.trainer.findUniqueOrThrow({ where: { userId: req.user!.id } });
      const sessions = await prisma.classSession.findMany({
        where: { classSchedule: { trainerId: trainer.id } },
        include: classSessionInclude,
        orderBy: { scheduledStartAt: 'asc' },
      });
      return res.json(sessions.map(toClassSessionDto));
    }

    // Admin: all sessions.
    const sessions = await prisma.classSession.findMany({
      include: classSessionInclude,
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
      include: classSessionInclude,
    });
    if (!session) throw new HttpApiError('not_found', 'Class not found.');

    if (req.user!.role === 'student') {
      const onThisClass = session.classSchedule.students.some(
        (link: (typeof session.classSchedule.students)[number]) => link.student.userId === req.user!.id,
      );
      if (!onThisClass) {
        throw new HttpApiError('forbidden', 'This class is not on your schedule.');
      }
    } else if (req.user!.role === 'trainer') {
      const trainer = await prisma.trainer.findUniqueOrThrow({ where: { userId: req.user!.id } });
      if (session.classSchedule.trainerId !== trainer.id) {
        throw new HttpApiError('forbidden', 'This class is not assigned to you.');
      }
    }

    res.json(toClassSessionDto(session));
  }),
);
