import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/error-handler.js';
import { HttpApiError } from '../lib/errors.js';
import { toUserDto } from '../lib/dto.js';

/**
 * Admin-only routes — not part of the shared contract's endpoint catalog
 * (those are the student/trainer-facing ones both apps consume). These
 * back the Admin web console, owned entirely by Person B, so the shapes
 * here can move independently of packages/shared.
 */
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

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
