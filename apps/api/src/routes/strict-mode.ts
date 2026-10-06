import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toStudentDto } from '../lib/dto.js';

export const strictModeRouter = Router();

const verifySchema = z.object({
  studentId: z.string().min(1),
  passcode: z.string().min(4).max(6),
});

// POST /strict-mode/verify-passcode
// Note (per SYSTEM_DESIGN §16): this passcode is a parent gate, not a
// security boundary. It deters a student from dismissing Strict Mode
// themselves — it does not protect sensitive data.
strictModeRouter.post(
  '/verify-passcode',
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'Invalid passcode request.');

    const student = await prisma.student.findUnique({
      where: { userId: parsed.data.studentId },
    });
    if (!student) throw new HttpApiError('not_found', 'Student not found.');

    if (!student.strictModePasscodeHash) {
      return res.json({ valid: false });
    }

    const valid = await bcrypt.compare(parsed.data.passcode, student.strictModePasscodeHash);
    res.json({ valid });
  }),
);

const toggleSchema = z.object({ passcode: z.string().min(4).max(6) });

// POST /strict-mode/enable — parent turns the feature ON for their child's
// account, proving it's really them by re-entering the admin-issued
// passcode. The app then auto-locks near class time (see the mobile
// StrictModeProvider) for as long as this stays true.
strictModeRouter.post(
  '/enable',
  requireAuth,
  requireRole('student'),
  asyncRoute(async (req, res) => {
    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'Passcode is required.');

    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    if (!student.strictModePasscodeHash) {
      throw new HttpApiError(
        'validation_error',
        'No Strict Mode passcode has been set for this account yet — ask the school to set one first.',
      );
    }
    const valid = await bcrypt.compare(parsed.data.passcode, student.strictModePasscodeHash);
    if (!valid) throw new HttpApiError('invalid_credentials', 'Incorrect passcode.');

    await prisma.$transaction([
      prisma.student.update({ where: { userId: student.userId }, data: { strictModeEnabled: true } }),
      prisma.strictModeEvent.create({
        data: { studentId: student.userId, classId: null, type: 'activated', source: 'parent' },
      }),
    ]);

    res.json(await toStudentDto(student.userId));
  }),
);

// POST /strict-mode/disable — same passcode gate, turns it back off.
strictModeRouter.post(
  '/disable',
  requireAuth,
  requireRole('student'),
  asyncRoute(async (req, res) => {
    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpApiError('validation_error', 'Passcode is required.');

    const student = await prisma.student.findUniqueOrThrow({ where: { userId: req.user!.id } });
    if (!student.strictModePasscodeHash) {
      throw new HttpApiError('validation_error', 'No Strict Mode passcode has been set for this account.');
    }
    const valid = await bcrypt.compare(parsed.data.passcode, student.strictModePasscodeHash);
    if (!valid) throw new HttpApiError('invalid_credentials', 'Incorrect passcode.');

    await prisma.$transaction([
      prisma.student.update({ where: { userId: student.userId }, data: { strictModeEnabled: false } }),
      prisma.strictModeEvent.create({
        data: {
          studentId: student.userId,
          classId: null,
          type: 'released',
          reason: 'passcode_override',
          source: 'parent',
        },
      }),
    ]);

    res.json(await toStudentDto(student.userId));
  }),
);
