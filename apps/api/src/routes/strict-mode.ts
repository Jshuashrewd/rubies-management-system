import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';

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
