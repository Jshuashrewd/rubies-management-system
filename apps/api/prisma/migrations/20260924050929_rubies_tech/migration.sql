-- DropForeignKey
ALTER TABLE "join_events" DROP CONSTRAINT "join_events_studentId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_studentId_fkey";

-- DropForeignKey
ALTER TABLE "strict_mode_events" DROP CONSTRAINT "strict_mode_events_studentId_fkey";

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_events" ADD CONSTRAINT "join_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strict_mode_events" ADD CONSTRAINT "strict_mode_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
