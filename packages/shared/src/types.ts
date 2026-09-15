/**
 * Rubies Code School — shared API contract.
 *
 * This file is the single source of truth for the shapes exchanged between the
 * mobile/web apps (Person A) and the backend (Person B). Change it together.
 *
 * Conventions:
 *  - All timestamps are ISO-8601 strings in UTC (e.g. "2026-09-23T14:30:00Z").
 *  - All ids are opaque strings.
 *  - The client sends/receives JSON; non-2xx responses use `ApiErrorBody`.
 */

/* ------------------------------------------------------------------ */
/* Enums / unions                                                      */
/* ------------------------------------------------------------------ */

export type Role = 'student' | 'trainer' | 'admin';

/** School ID format: RCS-[ROLE]-[YEAR]-[IDENTIFIER], e.g. "RCS-STU-2025-884". */
export type SchoolId = string;

export type ClassStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export type AttendanceStatus = 'present' | 'late' | 'absent';

export type ReportStatus = 'draft' | 'submitted' | 'sent';

export type StrictModeEventType = 'activated' | 'released';

/** Why Strict Mode ended. For the 2-week build, release is scheduled-time based. */
export type StrictModeReleaseReason = 'scheduled_end' | 'class_joined' | 'passcode_override';

export type StrictModeSource = 'auto' | 'parent';

/* ------------------------------------------------------------------ */
/* Core entities                                                       */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  schoolId: SchoolId;
  role: Role;
  firstName: string;
  lastName: string;
  email: string | null;
  /** True until the user replaces the default (surname) password. */
  mustChangePassword: boolean;
  createdAt: string;
}

export interface Student extends User {
  role: 'student';
  cohort: string; // e.g. "Fall 2025 Full-Stack"
  track: string; // e.g. "Track A"
  guardianName: string | null;
  guardianEmail: string; // reports are auto-sent here
  /** Current curriculum stage the student is on. */
  currentStageId: string | null;
  /** Whether a parent Strict Mode passcode has been set on this student. */
  strictModePasscodeSet: boolean;
}

export interface Trainer extends User {
  role: 'trainer';
  title: string | null; // e.g. "Lead Web Architect"
}

/** A scheduled class session (what powers the schedule + join + alarms). */
export interface ClassSession {
  id: string;
  title: string;
  description: string | null;
  trainerId: string;
  trainerName: string;
  cohort: string;
  track: string | null;
  /** The curriculum stage this session covers, if any. */
  curriculumStageId: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: ClassStatus;
  zoomJoinUrl: string;
  zoomMeetingId: string | null;
}

/** Links a student to a cohort/track (the basis for their schedule). */
export interface Enrollment {
  id: string;
  studentId: string;
  cohort: string;
  track: string;
  enrolledAt: string;
}

export interface CurriculumStage {
  id: string;
  /** 1-based position in the track (Stage 1..N). */
  order: number;
  title: string;
  description: string | null;
  track: string | null;
}

/** A student's progress through the curriculum (read model for the apps). */
export interface CurriculumProgress {
  studentId: string;
  currentStageId: string | null;
  currentStageOrder: number;
  totalStages: number;
  completedStageIds: string[];
  /** 0–100, precomputed by the backend. */
  percentComplete: number;
  stages: CurriculumStage[];
}

/** Structured post-class report (Trainer submits → backend emails guardian). */
export interface Report {
  id: string;
  classId: string;
  studentId: string;
  trainerId: string;
  status: ReportStatus;
  attendance: AttendanceStatus;
  /** Engagement/participation 1–5. */
  participation: number;
  curriculumStageId: string;
  /** True → backend auto-advances the student to the next stage. */
  stageCompleted: boolean;
  topicsCovered: string;
  strengths: string;
  areasToImprove: string;
  homework: string | null;
  trainerComments: string;
  submittedAt: string | null;
  createdAt: string;
}

/** Attendance signal: the student tapped "Join" (Zoom deep link opened). */
export interface JoinEvent {
  id: string;
  studentId: string;
  classId: string;
  joinedAt: string;
  source: 'zoom_deeplink';
}

export interface StrictModeEvent {
  id: string;
  studentId: string;
  classId: string | null;
  type: StrictModeEventType;
  reason: StrictModeReleaseReason | null;
  source: StrictModeSource;
  at: string;
}

/* ------------------------------------------------------------------ */
/* Auth DTOs                                                           */
/* ------------------------------------------------------------------ */

export interface LoginRequest {
  schoolId: SchoolId;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: true;
}

/* ------------------------------------------------------------------ */
/* Feature DTOs                                                        */
/* ------------------------------------------------------------------ */

/** Trainer app → backend. Backend fills ids/timestamps and emails the guardian. */
export interface CreateReportInput {
  classId: string;
  studentId: string;
  attendance: AttendanceStatus;
  participation: number;
  curriculumStageId: string;
  stageCompleted: boolean;
  topicsCovered: string;
  strengths: string;
  areasToImprove: string;
  homework?: string;
  trainerComments: string;
}

export interface LogJoinInput {
  classId: string;
}

export interface StrictModeActivateInput {
  classId: string;
  source: StrictModeSource;
}

export interface StrictModeReleaseInput {
  classId: string;
  reason: StrictModeReleaseReason;
  source: StrictModeSource;
}

/** Parent passcode check for toggling/dismissing Strict Mode early. */
export interface VerifyPasscodeInput {
  studentId: string;
  passcode: string;
}

export interface VerifyPasscodeResponse {
  valid: boolean;
}

/* ------------------------------------------------------------------ */
/* Error envelope                                                      */
/* ------------------------------------------------------------------ */

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'invalid_credentials'
  | 'password_change_required'
  | 'server_error';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string>;
  };
}
