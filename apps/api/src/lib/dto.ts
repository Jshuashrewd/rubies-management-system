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
    guardianName: user.student.guardianName,
    guardianEmail: user.student.guardianEmail,
    currentTopicId: user.student.currentTopicId,
    strictModePasscodeSet: user.student.strictModePasscodeHash !== null,
    strictModeEnabled: user.student.strictModeEnabled,
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

export function toLevelDto(level: {
  id: string;
  stage: string;
  order: number;
  title: string;
  description: string | null;
}) {
  return {
    id: level.id,
    stage: level.stage,
    order: level.order,
    title: level.title,
    description: level.description,
  };
}

export function toTopicDto(topic: {
  id: string;
  levelId: string;
  order: number;
  title: string;
  description: string | null;
}) {
  return {
    id: topic.id,
    levelId: topic.levelId,
    order: topic.order,
    title: topic.title,
    description: topic.description,
  };
}

export function toClassSessionDto(session: {
  id: string;
  classScheduleId: string;
  topicId: string | null;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  status: string;
  classSchedule: {
    title: string;
    trainerId: string;
    trainer: { user: { firstName: string; lastName: string } };
    zoomJoinUrl: string;
    students: { student: { userId: string; user: { firstName: string; lastName: string } } }[];
  };
}) {
  return {
    id: session.id,
    classScheduleId: session.classScheduleId,
    title: session.classSchedule.title,
    trainerId: session.classSchedule.trainerId,
    trainerName: `${session.classSchedule.trainer.user.firstName} ${session.classSchedule.trainer.user.lastName}`,
    topicId: session.topicId,
    students: session.classSchedule.students.map((link) => ({
      id: link.student.userId,
      firstName: link.student.user.firstName,
      lastName: link.student.user.lastName,
    })),
    scheduledStartAt: session.scheduledStartAt.toISOString(),
    scheduledEndAt: session.scheduledEndAt.toISOString(),
    status: session.status,
    zoomJoinUrl: session.classSchedule.zoomJoinUrl,
  };
}

/** Prisma `include` shared by every query that returns a ClassSession, so
 * the shape toClassSessionDto expects is always present. */
export const classSessionInclude = {
  classSchedule: {
    include: {
      trainer: { include: { user: true } },
      students: { include: { student: { include: { user: true } } } },
    },
  },
} as const;
