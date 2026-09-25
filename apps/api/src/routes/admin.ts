import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toUserDto, toClassSessionDto } from '../lib/dto.js';

/**
 * Admin-only routes — not part of the shared contract's endpoint catalog
 * (those are the student/trainer-facing ones both apps consume). These
 * back the Admin web console, owned entirely by Person B, so the shapes
 * here can move independently of packages/shared.
 */
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

// GET /admin/users — full list, for the admin dashboard's user table.
adminRouter.get(
  '/users',
  asyncRoute(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(await Promise.all(users.map(toUserDto)));
  }),
);

const createUserSchema = z.object({
  schoolId: z.string().min(1),
  role: z.enum(['student', 'trainer', 'admin']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  // Student-only fields
  cohort: z.string().optional(),
  track: z.string().optional(),
  guardianName: z.string().optional(),
  guardianEmail: z.string().email().optional(),
  // Trainer-only field
  title: z.string().optional(),
});

// POST /admin/users — create a user. Default password = lowercase surname
// (per the locked auth model); mustChangePassword starts true.
adminRouter.post(
  '/users',
  asyncRoute(async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError(
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid user data.',
      );
    }
    const input = parsed.data;

    const existing = await prisma.user.findUnique({ where: { schoolId: input.schoolId } });
    if (existing) throw new HttpApiError('validation_error', 'That School ID is already in use.');

    if (input.role === 'student' && (!input.cohort || !input.track || !input.guardianEmail)) {
      throw new HttpApiError(
        'validation_error',
        'cohort, track, and guardianEmail are required for a student.',
      );
    }

    const defaultPasswordHash = await bcrypt.hash(input.lastName.toLowerCase(), 10);

    const user = await prisma.user.create({
      data: {
        schoolId: input.schoolId,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: defaultPasswordHash,
        mustChangePassword: true,
        ...(input.role === 'student'
          ? {
              student: {
                create: {
                  cohort: input.cohort!,
                  track: input.track!,
                  guardianName: input.guardianName,
                  guardianEmail: input.guardianEmail!,
                },
              },
            }
          : {}),
        ...(input.role === 'trainer'
          ? { trainer: { create: { title: input.title } } }
          : {}),
      },
    });

    res.status(201).json(await toUserDto(user));
  }),
);

// POST /admin/users/:id/reset-password — regenerate default password
// (lowercase surname), force mustChangePassword again.
adminRouter.post(
  '/users/:id/reset-password',
  asyncRoute(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new HttpApiError('not_found', 'User not found.');

    const newHash = await bcrypt.hash(user.lastName.toLowerCase(), 10);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: true },
    });

    res.json(await toUserDto(updated));
  }),
);

const setPasscodeSchema = z.object({ passcode: z.string().min(4).max(6) });

// POST /admin/students/:id/strict-mode-passcode — admin issues/updates the
// parent Strict Mode passcode for a student (per the Tier-1 design).
adminRouter.post(
  '/students/:id/strict-mode-passcode',
  asyncRoute(async (req, res) => {
    const parsed = setPasscodeSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'Passcode must be 4–6 digits.');

    const student = await prisma.student.findUnique({ where: { userId: req.params.id } });
    if (!student) throw new HttpApiError('not_found', 'Student not found.');

    const hash = await bcrypt.hash(parsed.data.passcode, 10);
    await prisma.student.update({
      where: { userId: student.userId },
      data: { strictModePasscodeHash: hash },
    });

    res.json({ success: true });
  }),
);

// ---------------------------------------------------------------------------
// Curriculum stages
// ---------------------------------------------------------------------------

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

const createStageSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  track: z.string().min(1),
});

// POST /admin/curriculum-stages — create one stage in a track's sequence.
// `order` determines where it sits — reports.stageCompleted uses this to
// find "the next stage" (see routes/reports.ts), so keep orders unique
// and gapless within a track if you want auto-advance to make sense.
adminRouter.post(
  '/curriculum-stages',
  asyncRoute(async (req, res) => {
    const parsed = createStageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError(
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid curriculum stage data.',
      );
    }
    const stage = await prisma.curriculumStage.create({ data: parsed.data });
    res.status(201).json(toStageDto(stage));
  }),
);

// GET /admin/curriculum-stages[?track] — full list for the admin console
// (unlike GET /curriculum/stages which any authenticated user can call,
// this is here for symmetry/admin-specific filtering, e.g. by track).
adminRouter.get(
  '/curriculum-stages',
  asyncRoute(async (req, res) => {
    const track = req.query.track as string | undefined;
    const stages = await prisma.curriculumStage.findMany({
      where: track ? { track } : undefined,
      orderBy: { order: 'asc' },
    });
    res.json(stages.map(toStageDto));
  }),
);

// ---------------------------------------------------------------------------
// Class sessions
// ---------------------------------------------------------------------------

const createClassSessionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  trainerUserId: z.string().min(1), // the trainer's User.id (from GET /admin/users)
  cohort: z.string().min(1),
  track: z.string().optional(),
  curriculumStageId: z.string().optional(),
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime(),
  zoomJoinUrl: z.string().url(),
  zoomMeetingId: z.string().optional(),
});

// POST /admin/class-sessions — schedule a class. This is the piece that
// unblocks everything else: without a ClassSession, a trainer has nothing
// to submit a report against and a student has nothing on their schedule.
adminRouter.post(
  '/class-sessions',
  asyncRoute(async (req, res) => {
    const parsed = createClassSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError(
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid class session data.',
      );
    }
    const input = parsed.data;

    if (new Date(input.scheduledEndAt) <= new Date(input.scheduledStartAt)) {
      throw new HttpApiError('validation_error', 'scheduledEndAt must be after scheduledStartAt.');
    }

    const trainer = await prisma.trainer.findUnique({ where: { userId: input.trainerUserId } });
    if (!trainer) {
      throw new HttpApiError('not_found', 'No trainer found for that trainerUserId.');
    }

    if (input.curriculumStageId) {
      const stage = await prisma.curriculumStage.findUnique({
        where: { id: input.curriculumStageId },
      });
      if (!stage) throw new HttpApiError('not_found', 'curriculumStageId does not exist.');
    }

    const session = await prisma.classSession.create({
      data: {
        title: input.title,
        description: input.description,
        trainerId: trainer.id,
        cohort: input.cohort,
        track: input.track,
        curriculumStageId: input.curriculumStageId,
        scheduledStartAt: new Date(input.scheduledStartAt),
        scheduledEndAt: new Date(input.scheduledEndAt),
        zoomJoinUrl: input.zoomJoinUrl,
        zoomMeetingId: input.zoomMeetingId,
      },
      include: { trainer: { include: { user: true } } },
    });

    res.status(201).json(toClassSessionDto(session));
  }),
);

const updateClassSessionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'live', 'ended', 'cancelled']).optional(),
  zoomJoinUrl: z.string().url().optional(),
});

// PATCH /admin/class-sessions/:id — reschedule, cancel, or mark a class
// ended. (A trainer "End Class" action, if you build one later, should hit
// this same endpoint with { status: "ended" } — no need for a second route.)
adminRouter.patch(
  '/class-sessions/:id',
  asyncRoute(async (req, res) => {
    const parsed = updateClassSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError(
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid update.',
      );
    }
    const existing = await prisma.classSession.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpApiError('not_found', 'Class session not found.');

    const data = { ...parsed.data } as Record<string, unknown>;
    if (data.scheduledStartAt) data.scheduledStartAt = new Date(data.scheduledStartAt as string);
    if (data.scheduledEndAt) data.scheduledEndAt = new Date(data.scheduledEndAt as string);

    const updated = await prisma.classSession.update({
      where: { id: req.params.id },
      data,
      include: { trainer: { include: { user: true } } },
    });

    res.json(toClassSessionDto(updated));
  }),
);
