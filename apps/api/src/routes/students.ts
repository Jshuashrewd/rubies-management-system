import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toStudentDto } from '../lib/dto.js';

export const studentsRouter = Router();

// GET /trainer/students — students on any ClassSchedule this trainer teaches.
studentsRouter.get(
  '/trainer/students',
  requireAuth,
  requireRole('trainer'),
  asyncRoute(async (req, res) => {
    const trainer = await prisma.trainer.findUniqueOrThrow({ where: { userId: req.user!.id } });

    const links = await prisma.classScheduleStudent.findMany({
      where: { classSchedule: { trainerId: trainer.id } },
      select: { studentId: true },
      distinct: ['studentId'],
    });

    const dtos = await Promise.all(links.map((l: (typeof links)[number]) => toStudentDto(l.studentId)));
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
      const teachesThem = await prisma.classScheduleStudent.findFirst({
        where: { studentId: student.userId, classSchedule: { trainerId: trainer.id } },
      });
      if (!teachesThem) {
        throw new HttpApiError('forbidden', 'This student is not assigned to you.');
      }
    }

    res.json(await toStudentDto(student.userId));
  }),
);
