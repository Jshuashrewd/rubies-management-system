import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { sendReportEmail } from '../lib/email.js';

export const reportsRouter = Router();

function toReportDto(r: {
  id: string;
  classId: string;
  studentId: string;
  trainerId: string;
  status: string;
  attendance: string;
  participation: number;
  topicId: string;
  topicCompleted: boolean;
  topicsCovered: string;
  strengths: string;
  areasToImprove: string;
  homework: string | null;
  trainerComments: string;
  submittedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    classId: r.classId,
    studentId: r.studentId,
    trainerId: r.trainerId,
    status: r.status,
    attendance: r.attendance,
    participation: r.participation,
    topicId: r.topicId,
    topicCompleted: r.topicCompleted,
    topicsCovered: r.topicsCovered,
    strengths: r.strengths,
    areasToImprove: r.areasToImprove,
    homework: r.homework,
    trainerComments: r.trainerComments,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

const createReportSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  attendance: z.enum(['present', 'late', 'absent']),
  participation: z.number().int().min(1).max(5),
  topicId: z.string().min(1),
  topicCompleted: z.boolean(),
  topicsCovered: z.string().min(1),
  strengths: z.string().min(1),
  areasToImprove: z.string().min(1),
  homework: z.string().optional(),
  trainerComments: z.string().min(1),
});

/**
 * Given a completed topic, find what a student moves to next:
 *   1. the next Topic in the same Level (by order), else
 *   2. the first Topic of the next Level in the same Stage (by order), else
 *   3. the first Topic of the first Level of the next Stage, else
 *   4. null — they've finished the entire curriculum; stay put.
 */
async function findNextTopicId(currentTopicId: string): Promise<string | null> {
  const current = await prisma.topic.findUniqueOrThrow({
    where: { id: currentTopicId },
    include: { level: true },
  });

  const nextInLevel = await prisma.topic.findFirst({
    where: { levelId: current.levelId, order: { gt: current.order } },
    orderBy: { order: 'asc' },
  });
  if (nextInLevel) return nextInLevel.id;

  const nextLevel = await prisma.level.findFirst({
    where: { stage: current.level.stage, order: { gt: current.level.order } },
    orderBy: { order: 'asc' },
    include: { topics: { orderBy: { order: 'asc' }, take: 1 } },
  });
  if (nextLevel?.topics[0]) return nextLevel.topics[0].id;

  const STAGE_ORDER = ['scratch', 'creator', 'innovator'] as const;
  const stageIndex = STAGE_ORDER.indexOf(current.level.stage as (typeof STAGE_ORDER)[number]);
  const nextStage = STAGE_ORDER[stageIndex + 1];
  if (!nextStage) return null; // finished Innovator — nothing further

  const firstLevelOfNextStage = await prisma.level.findFirst({
    where: { stage: nextStage },
    orderBy: { order: 'asc' },
    include: { topics: { orderBy: { order: 'asc' }, take: 1 } },
  });
  return firstLevelOfNextStage?.topics[0]?.id ?? null;
}

// POST /reports — trainer submits → persist, auto-advance topic, email guardian.
reportsRouter.post(
  '/',
  requireAuth,
  requireRole('trainer'),
  asyncRoute(async (req, res) => {
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError(
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid report data.',
      );
    }
    const input = parsed.data;

    const trainer = await prisma.trainer.findUniqueOrThrow({ where: { userId: req.user!.id } });

    const [classSession, student, topic] = await Promise.all([
      prisma.classSession.findUnique({
        where: { id: input.classId },
        include: { classSchedule: true },
      }),
      prisma.student.findUnique({
        where: { userId: input.studentId },
        include: { user: true },
      }),
      prisma.topic.findUnique({ where: { id: input.topicId } }),
    ]);
    if (!classSession) throw new HttpApiError('not_found', 'Class not found.');
    if (!student) throw new HttpApiError('not_found', 'Student not found.');
    if (!topic) throw new HttpApiError('not_found', 'Topic not found.');
    if (classSession.classSchedule.trainerId !== trainer.id) {
      throw new HttpApiError('forbidden', 'This class is not assigned to you.');
    }

    // Persist the report as `submitted` first — the email is a side effect,
    // not a condition of saving the trainer's work.
    const report = await prisma.report.create({
      data: {
        classId: input.classId,
        studentId: student.userId,
        trainerId: trainer.id,
        status: 'submitted',
        attendance: input.attendance,
        participation: input.participation,
        topicId: input.topicId,
        topicCompleted: input.topicCompleted,
        topicsCovered: input.topicsCovered,
        strengths: input.strengths,
        areasToImprove: input.areasToImprove,
        homework: input.homework,
        trainerComments: input.trainerComments,
        submittedAt: new Date(),
      },
    });

    // Auto-advance: submitting topicCompleted=true moves the student to the
    // next topic — within the level, then the next level, then the next
    // stage. This is the ONLY thing that advances a student.
    if (input.topicCompleted) {
      const nextTopicId = await findNextTopicId(input.topicId);
      await prisma.student.update({
        where: { userId: student.userId },
        data: { currentTopicId: nextTopicId ?? input.topicId },
      });
    }

    // Send the guardian email. If this fails, the report still exists and
    // stays `submitted` (not `sent`) — visible to admin/trainer as a
    // delivery failure to retry, rather than silently losing the report.
    const trainerUser = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    try {
      await sendReportEmail({
        guardianEmail: student.guardianEmail,
        guardianName: student.guardianName,
        studentFirstName: student.user.firstName,
        classTitle: classSession.classSchedule.title,
        trainerName: `${trainerUser.firstName} ${trainerUser.lastName}`,
        attendance: input.attendance,
        participation: input.participation,
        topicsCovered: input.topicsCovered,
        strengths: input.strengths,
        areasToImprove: input.areasToImprove,
        homework: input.homework ?? null,
        trainerComments: input.trainerComments,
        stageCompleted: input.topicCompleted,
        stageTitle: topic.title,
      });
      const sent = await prisma.report.update({
        where: { id: report.id },
        data: { status: 'sent' },
      });
      return res.status(201).json(toReportDto(sent));
    } catch (emailError) {
      console.error('[reports] guardian email failed:', emailError);
      return res.status(201).json(toReportDto(report));
    }
  }),
);

// GET /reports[?studentId&classId]
reportsRouter.get(
  '/',
  requireAuth,
  requireRole('trainer', 'admin'),
  asyncRoute(async (req, res) => {
    const { studentId, classId } = req.query as { studentId?: string; classId?: string };

    const where: { studentId?: string; classId?: string; trainerId?: string } = {};
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;

    if (req.user!.role === 'trainer') {
      const trainer = await prisma.trainer.findUniqueOrThrow({ where: { userId: req.user!.id } });
      where.trainerId = trainer.id;
    }

    const reports = await prisma.report.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(reports.map(toReportDto));
  }),
);
