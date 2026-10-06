import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { classSessionInclude, toClassSessionDto, toLevelDto, toTopicDto, toUserDto } from '../lib/dto.js';

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
  guardianName: z.string().optional(),
  guardianEmail: z.string().email().optional(),
  /** Optional — where they start in the curriculum. Can be set later. */
  startingTopicId: z.string().optional(),
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

    if (input.role === 'student' && !input.guardianEmail) {
      throw new HttpApiError('validation_error', 'guardianEmail is required for a student.');
    }
    if (input.startingTopicId) {
      const topic = await prisma.topic.findUnique({ where: { id: input.startingTopicId } });
      if (!topic) throw new HttpApiError('validation_error', 'startingTopicId does not exist.');
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
                  guardianName: input.guardianName,
                  guardianEmail: input.guardianEmail!,
                  currentTopicId: input.startingTopicId,
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
// Curriculum: Stage (fixed) -> Level (admin) -> Topic (admin)
// ---------------------------------------------------------------------------

const STAGES = ['scratch', 'creator', 'innovator'] as const;

const createLevelSchema = z.object({
  stage: z.enum(STAGES),
  order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

// POST /admin/levels
adminRouter.post(
  '/levels',
  asyncRoute(async (req, res) => {
    const parsed = createLevelSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError('validation_error', parsed.error.issues[0]?.message ?? 'Invalid level.');
    }
    const existing = await prisma.level.findFirst({
      where: { stage: parsed.data.stage, order: parsed.data.order },
    });
    if (existing) {
      throw new HttpApiError('validation_error', `Order ${parsed.data.order} is already used in ${parsed.data.stage}.`);
    }
    const level = await prisma.level.create({ data: parsed.data });
    res.status(201).json(toLevelDto(level));
  }),
);

// GET /admin/levels[?stage] — with nested topics, for the curriculum page.
adminRouter.get(
  '/levels',
  asyncRoute(async (req, res) => {
    const stage = req.query.stage as string | undefined;
    const levels = await prisma.level.findMany({
      where: stage ? { stage: stage as never } : undefined,
      include: { topics: { orderBy: { order: 'asc' } } },
      orderBy: [{ stage: 'asc' }, { order: 'asc' }],
    });
    res.json(
      levels.map((l: (typeof levels)[number]) => ({ ...toLevelDto(l), topics: l.topics.map(toTopicDto) })),
    );
  }),
);

const createTopicSchema = z.object({
  levelId: z.string().min(1),
  order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

// POST /admin/topics
adminRouter.post(
  '/topics',
  asyncRoute(async (req, res) => {
    const parsed = createTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError('validation_error', parsed.error.issues[0]?.message ?? 'Invalid topic.');
    }
    const level = await prisma.level.findUnique({ where: { id: parsed.data.levelId } });
    if (!level) throw new HttpApiError('not_found', 'levelId does not exist.');

    const existing = await prisma.topic.findFirst({
      where: { levelId: parsed.data.levelId, order: parsed.data.order },
    });
    if (existing) {
      throw new HttpApiError('validation_error', `Order ${parsed.data.order} is already used in this level.`);
    }

    const topic = await prisma.topic.create({ data: parsed.data });
    res.status(201).json(toTopicDto(topic));
  }),
);

// ---------------------------------------------------------------------------
// Class schedules — a recurring booking that generates ClassSessions
// ---------------------------------------------------------------------------

const MAX_GENERATED_SESSIONS = 60;

const createClassScheduleSchema = z.object({
  title: z.string().min(1),
  trainerUserId: z.string().min(1), // the trainer's User.id
  studentUserIds: z.array(z.string().min(1)).min(1, 'At least one student is required.'),
  /** 0 = Sunday … 6 = Saturday. At least one day required. */
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  /** "HH:mm" in the school's local time, e.g. "16:00". */
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:mm.'),
  durationMinutes: z.number().int().min(15).max(240),
  /** "YYYY-MM-DD". Can equal startDate for a single booked day. */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topicId: z.string().optional(),
  zoomJoinUrl: z.string().url(),
  paidThroughNote: z.string().optional(),
});

// POST /admin/class-schedules — creates the recurring booking AND every
// individual ClassSession for the matching days in the range, right away.
adminRouter.post(
  '/class-schedules',
  asyncRoute(async (req, res) => {
    const parsed = createClassScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpApiError(
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid class schedule.',
      );
    }
    const input = parsed.data;

    const trainer = await prisma.trainer.findUnique({ where: { userId: input.trainerUserId } });
    if (!trainer) throw new HttpApiError('not_found', 'No trainer found for that trainerUserId.');

    const students = await prisma.student.findMany({
      where: { userId: { in: input.studentUserIds } },
    });
    if (students.length !== input.studentUserIds.length) {
      throw new HttpApiError('not_found', 'One or more studentUserIds do not exist.');
    }

    if (input.topicId) {
      const topic = await prisma.topic.findUnique({ where: { id: input.topicId } });
      if (!topic) throw new HttpApiError('not_found', 'topicId does not exist.');
    }

    const start = new Date(`${input.startDate}T00:00:00`);
    const end = new Date(`${input.endDate}T00:00:00`);
    if (end < start) throw new HttpApiError('validation_error', 'endDate must be on or after startDate.');

    const [startHour = 0, startMinute = 0] = input.startTime.split(':').map(Number);
    const startMinuteOfDay = startHour * 60 + startMinute;
    const daySet = new Set(input.daysOfWeek);

    const occurrences: Date[] = [];
    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      if (daySet.has(cursor.getDay())) occurrences.push(new Date(cursor));
    }
    if (occurrences.length === 0) {
      throw new HttpApiError(
        'validation_error',
        'No day in daysOfWeek falls within startDate..endDate.',
      );
    }
    if (occurrences.length > MAX_GENERATED_SESSIONS) {
      throw new HttpApiError(
        'validation_error',
        `That range would create ${occurrences.length} sessions — max is ${MAX_GENERATED_SESSIONS}. Narrow the date range or split it into more than one schedule.`,
      );
    }

    const schedule = await prisma.classSchedule.create({
      data: {
        title: input.title,
        trainerId: trainer.id,
        daysOfWeek: input.daysOfWeek,
        startMinuteOfDay,
        durationMinutes: input.durationMinutes,
        startDate: start,
        endDate: end,
        zoomJoinUrl: input.zoomJoinUrl,
        paidThroughNote: input.paidThroughNote,
        students: {
          create: students.map((s: (typeof students)[number]) => ({ studentId: s.userId })),
        },
        sessions: {
          create: occurrences.map((day) => {
            const scheduledStartAt = new Date(day);
            scheduledStartAt.setMinutes(scheduledStartAt.getMinutes() + startMinuteOfDay);
            const scheduledEndAt = new Date(scheduledStartAt);
            scheduledEndAt.setMinutes(scheduledEndAt.getMinutes() + input.durationMinutes);
            return { topicId: input.topicId, scheduledStartAt, scheduledEndAt };
          }),
        },
      },
      include: { sessions: { include: classSessionInclude } },
    });

    res.status(201).json({
      id: schedule.id,
      title: schedule.title,
      sessionsCreated: schedule.sessions.length,
      sessions: schedule.sessions.map(toClassSessionDto),
    });
  }),
);

const updateSessionStatusSchema = z.object({
  status: z.enum(['scheduled', 'live', 'ended', 'cancelled']),
});

// PATCH /admin/class-sessions/:id — mark one occurrence ended/cancelled,
// without touching the rest of its schedule's sessions.
adminRouter.patch(
  '/class-sessions/:id',
  asyncRoute(async (req, res) => {
    const parsed = updateSessionStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'Invalid status.');

    const existing = await prisma.classSession.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpApiError('not_found', 'Class session not found.');

    const updated = await prisma.classSession.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
      include: classSessionInclude,
    });

    res.json(toClassSessionDto(updated));
  }),
);
