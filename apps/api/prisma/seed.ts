/**
 * Creates one admin account so you have a way to log in and start using
 * the /admin routes to create everyone else (trainers, students).
 * Run with: npm run seed  (from apps/api)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schoolId = 'RCS-ADM-2026-001';
  const existing = await prisma.user.findUnique({ where: { schoolId } });
  if (existing) {
    console.log(`Admin ${schoolId} already exists — skipping.`);
    return;
  }

  // Default password = lowercase surname, same rule as every other account.
  const passwordHash = await bcrypt.hash('admin', 10);

  await prisma.user.create({
    data: {
      schoolId,
      role: 'admin',
      firstName: 'Rubies',
      lastName: 'Admin',
      passwordHash,
      mustChangePassword: true,
    },
  });

  console.log(`Created admin: ${schoolId} / password: admin (must change on first login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
