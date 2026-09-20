/**
 * Maps Prisma rows to the exact DTO shapes in packages/shared/src/types.ts.
 * Keeping this in one place means a contract change only requires editing
 * here, not hunting through every route.
 */
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from './prisma.js';

export async function toUserDto(user: PrismaUser) {
  return {
    id: user.id,
    schoolId: user.schoolId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Full Student DTO (User fields + student-specific fields). */
export async function toStudentDto(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { student: true },
  });
  if (!user.student) throw new Error(`User ${userId} has role=student but no Student row.`);

  return {
    ...(await toUserDto(user)),
    role: 'student' as const,
    cohort: user.student.cohort,
    track: user.student.track,
    guardianName: user.student.guardianName,
    guardianEmail: user.student.guardianEmail,
    currentStageId: user.student.currentStageId,
    strictModePasscodeSet: user.student.strictModePasscodeHash !== null,
  };
}

export async function toTrainerDto(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { trainer: true },
  });
  if (!user.trainer) throw new Error(`User ${userId} has role=trainer but no Trainer row.`);

  return {
    ...(await toUserDto(user)),
    role: 'trainer' as const,
    title: user.trainer.title,
  };
}

export function toClassSessionDto(session: {
  id: string;
  title: string;
  description: string | null;
  trainerId: string;
  trainer: { user: { firstName: string; lastName: string } };
  cohort: string;
  track: string | null;
  curriculumStageId: string | null;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  status: string;
  zoomJoinUrl: string;
  zoomMeetingId: string | null;
}) {
  return {
    id: session.id,
    title: session.title,
    description: session.description,
    trainerId: session.trainerId,
    trainerName: `${session.trainer.user.firstName} ${session.trainer.user.lastName}`,
    cohort: session.cohort,
    track: session.track,
    curriculumStageId: session.curriculumStageId,
    scheduledStartAt: session.scheduledStartAt.toISOString(),
    scheduledEndAt: session.scheduledEndAt.toISOString(),
    status: session.status,
    zoomJoinUrl: session.zoomJoinUrl,
    zoomMeetingId: session.zoomMeetingId,
  };
}
