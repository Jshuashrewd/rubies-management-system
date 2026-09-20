import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';

export const curriculumRouter = Router();

function toStageDto(stage: {
  id: string;
  order: number;
  title: string;
  description: string | null;
  track: string | null;
}) {
  return {
    id: stage.id,
    order: stage.order,
    title: stage.title,
    description: stage.description,
    track: stage.track,
  };
}

// GET /curriculum/stages
curriculumRouter.get(
  '/stages',
  requireAuth,
  asyncRoute(async (_req, res) => {
    const stages = await prisma.curriculumStage.findMany({ orderBy: { order: 'asc' } });
    res.json(stages.map(toStageDto));
  }),
);

// GET /curriculum/progress[?studentId] — self for students, by id for trainers/admin.
curriculumRouter.get(
  '/progress',
  requireAuth,
  asyncRoute(async (req, res) => {
    let studentUserId: string;

    if (req.user!.role === 'student') {
      studentUserId = req.user!.id;
    } else {
      const studentId = req.query.studentId as string | undefined;
      if (!studentId) {
        throw new HttpApiError('validation_error', 'studentId is required for this role.');
      }
      studentUserId = studentId;
    }

    const student = await prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { currentStage: true },
    });
    if (!student) throw new HttpApiError('not_found', 'Student not found.');

    const trackStages = await prisma.curriculumStage.findMany({
      where: { track: student.track },
      orderBy: { order: 'asc' },
    });

    const currentOrder = student.currentStage?.order ?? 0;
    const completedStageIds = trackStages
      .filter((s: { order: number }) => s.order < currentOrder)
      .map((s: { id: string }) => s.id);

    const percentComplete =
      trackStages.length === 0 ? 0 : Math.round((completedStageIds.length / trackStages.length) * 100);

    res.json({
      studentId: student.userId,
      currentStageId: student.currentStageId,
      currentStageOrder: currentOrder,
      totalStages: trackStages.length,
      completedStageIds,
      percentComplete,
      stages: trackStages.map(toStageDto),
    });
  }),
);
