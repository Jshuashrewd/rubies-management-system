import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';

export const eventsRouter = Router();

// POST /events/join — attendance signal when the student taps "Join on Zoom".
eventsRouter.post(
  '/join',
  requireAuth,
  requireRole('student'),
  asyncRoute(async (req, res) => {
    const schema = z.object({ classId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'classId is required.');

    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });

    const joinEvent = await prisma.joinEvent.create({
      data: {
        studentId: student.userId,
        classId: parsed.data.classId,
        source: 'zoom_deeplink',
      },
    });

    res.status(201).json({
      id: joinEvent.id,
      studentId: joinEvent.studentId,
      classId: joinEvent.classId,
      joinedAt: joinEvent.joinedAt.toISOString(),
      source: 'zoom_deeplink' as const,
    });
  }),
);

const strictModeEventSchema = z.object({
  classId: z.string().nullable().optional(),
  source: z.enum(['auto', 'parent']),
});

// POST /events/strict-mode/activate
eventsRouter.post(
  '/strict-mode/activate',
  requireAuth,
  requireRole('student'),
  asyncRoute(async (req, res) => {
    const parsed = strictModeEventSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'Invalid Strict Mode event.');

    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const event = await prisma.strictModeEvent.create({
      data: {
        studentId: student.userId,
        classId: parsed.data.classId ?? null,
        type: 'activated',
        source: parsed.data.source,
      },
    });

    res.status(201).json({
      id: event.id,
      studentId: event.studentId,
      classId: event.classId,
      type: 'activated' as const,
      reason: null,
      source: event.source,
      at: event.at.toISOString(),
    });
  }),
);

const strictModeReleaseSchema = z.object({
  classId: z.string().nullable().optional(),
  reason: z.enum(['scheduled_end', 'class_joined', 'passcode_override']),
  source: z.enum(['auto', 'parent']),
});

// POST /events/strict-mode/release
eventsRouter.post(
  '/strict-mode/release',
  requireAuth,
  requireRole('student'),
  asyncRoute(async (req, res) => {
    const parsed = strictModeReleaseSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'Invalid Strict Mode event.');

    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const event = await prisma.strictModeEvent.create({
      data: {
        studentId: student.userId,
        classId: parsed.data.classId ?? null,
        type: 'released',
        reason: parsed.data.reason,
        source: parsed.data.source,
      },
    });

    res.status(201).json({
      id: event.id,
      studentId: event.studentId,
      classId: event.classId,
      type: 'released' as const,
      reason: event.reason,
      source: event.source,
      at: event.at.toISOString(),
    });
  }),
);
