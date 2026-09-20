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
  curriculumStageId: string;
  stageCompleted: boolean;
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
    curriculumStageId: r.curriculumStageId,
    stageCompleted: r.stageCompleted,
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
  curriculumStageId: z.string().min(1),
  stageCompleted: z.boolean(),
  topicsCovered: z.string().min(1),
  strengths: z.string().min(1),
  areasToImprove: z.string().min(1),
  homework: z.string().optional(),
  trainerComments: z.string().min(1),
});

// POST /reports — trainer submits → persist, auto-advance stage, email guardian.
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

    const [classSession, student, stage] = await Promise.all([
      prisma.classSession.findUnique({ where: { id: input.classId } }),
      prisma.student.findUnique({
        where: { userId: input.studentId },
        include: { user: true },
      }),
      prisma.curriculumStage.findUnique({ where: { id: input.curriculumStageId } }),
    ]);
    if (!classSession) throw new HttpApiError('not_found', 'Class not found.');
    if (!student) throw new HttpApiError('not_found', 'Student not found.');
    if (!stage) throw new HttpApiError('not_found', 'Curriculum stage not found.');
    if (classSession.trainerId !== trainer.id) {
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
        curriculumStageId: input.curriculumStageId,
        stageCompleted: input.stageCompleted,
        topicsCovered: input.topicsCovered,
        strengths: input.strengths,
        areasToImprove: input.areasToImprove,
        homework: input.homework,
        trainerComments: input.trainerComments,
        submittedAt: new Date(),
      },
    });

    // Auto-advance: submitting stageCompleted=true moves the student to the
    // next stage in their track. This is the ONLY thing that advances a
    // student — reporting and curriculum progress stay in lockstep.
    if (input.stageCompleted) {
      const nextStage = await prisma.curriculumStage.findFirst({
        where: { track: student.track, order: { gt: stage.order } },
        orderBy: { order: 'asc' },
      });
      await prisma.student.update({
        where: { userId: student.userId },
        data: { currentStageId: nextStage?.id ?? stage.id },
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
        classTitle: classSession.title,
        trainerName: `${trainerUser.firstName} ${trainerUser.lastName}`,
        attendance: input.attendance,
        participation: input.participation,
        topicsCovered: input.topicsCovered,
        strengths: input.strengths,
        areasToImprove: input.areasToImprove,
        homework: input.homework ?? null,
        trainerComments: input.trainerComments,
        stageCompleted: input.stageCompleted,
        stageTitle: stage.title,
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
