import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toLevelDto, toTopicDto } from '../lib/dto.js';

export const curriculumRouter = Router();

// GET /curriculum/levels[?stage] — every level, each with its topics, ordered.
curriculumRouter.get(
  '/levels',
  requireAuth,
  asyncRoute(async (req, res) => {
    const stage = req.query.stage as string | undefined;
    const levels = await prisma.level.findMany({
      where: stage ? { stage: stage as never } : undefined,
      include: { topics: { orderBy: { order: 'asc' } } },
      orderBy: [{ stage: 'asc' }, { order: 'asc' }],
    });
    res.json(
      levels.map((l: (typeof levels)[number]) => ({
        ...toLevelDto(l),
        topics: l.topics.map(toTopicDto),
      })),
    );
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
      include: { currentTopic: { include: { level: true } } },
    });
    if (!student) throw new HttpApiError('not_found', 'Student not found.');

    // Every level+topic in the student's current stage, so the client can
    // render "where they are" without a second round trip. If they haven't
    // started anything yet, default to the whole curriculum (all stages)
    // being unknown — front end should prompt to set a starting topic.
    const currentStage = student.currentTopic?.level.stage ?? null;
    const stageLevels = currentStage
      ? await prisma.level.findMany({
          where: { stage: currentStage },
          include: { topics: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        })
      : [];

    const allTopicsInStage = stageLevels.flatMap((l: (typeof stageLevels)[number]) =>
      l.topics.map((t: (typeof l.topics)[number]) => ({ ...t, levelOrder: l.order })),
    );
    const currentIndex = allTopicsInStage.findIndex(
      (t: (typeof allTopicsInStage)[number]) => t.id === student.currentTopicId,
    );
    const completedTopicIds =
      currentIndex >= 0 ? allTopicsInStage.slice(0, currentIndex).map((t: (typeof allTopicsInStage)[number]) => t.id) : [];

    res.json({
      studentId: student.userId,
      currentStage,
      currentTopicId: student.currentTopicId,
      currentLevelId: student.currentTopic?.levelId ?? null,
      totalTopicsInStage: allTopicsInStage.length,
      completedTopicIds,
      percentComplete:
        allTopicsInStage.length === 0
          ? 0
          : Math.round((completedTopicIds.length / allTopicsInStage.length) * 100),
      levels: stageLevels.map((l: (typeof stageLevels)[number]) => ({
        ...toLevelDto(l),
        topics: l.topics.map(toTopicDto),
      })),
    });
  }),
);
