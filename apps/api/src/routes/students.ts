import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toStudentDto } from '../lib/dto.js';

export const studentsRouter = Router();

// GET /trainer/students — students in any cohort/track the trainer teaches.
studentsRouter.get(
  '/trainer/students',
  requireAuth,
  requireRole('trainer'),
  asyncRoute(async (req, res) => {
    const trainer = await prisma.trainer.findUniqueOrThrow({ where: { userId: req.user!.id } });

    const sessions = await prisma.classSession.findMany({
      where: { trainerId: trainer.id },
      select: { cohort: true, track: true },
      distinct: ['cohort', 'track'],
    });

    if (sessions.length === 0) return res.json([]);

    const students = await prisma.student.findMany({
      where: {
        OR: sessions.map((s: { cohort: string; track: string | null }) => ({
          cohort: s.cohort,
          track: s.track ?? undefined,
        })),
      },
    });

    const dtos = await Promise.all(
      students.map((s: { userId: string }) => toStudentDto(s.userId)),
    );
    res.json(dtos);
  }),
);

// GET /students/:id — trainer viewing one of their students.
studentsRouter.get(
  '/students/:id',
  requireAuth,
  requireRole('trainer', 'admin'),
  asyncRoute(async (req, res) => {
    const student = await prisma.student.findUnique({ where: { userId: req.params.id } });
    if (!student) throw new HttpApiError('not_found', 'Student not found.');

    if (req.user!.role === 'trainer') {
      const trainer = await prisma.trainer.findUniqueOrThrow({ where: { userId: req.user!.id } });
      const teachesThem = await prisma.classSession.findFirst({
        where: { trainerId: trainer.id, cohort: student.cohort, track: student.track },
      });
      if (!teachesThem) {
        throw new HttpApiError('forbidden', 'This student is not assigned to you.');
      }
    }

    res.json(await toStudentDto(student.userId));
  }),
);
