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

/** The academy's 3 fixed stages, in progression order. Not admin-creatable. */
export type Stage = 'scratch' | 'creator' | 'innovator';

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
  guardianName: string | null;
  guardianEmail: string; // reports are auto-sent here
  /** The Topic the student is currently working on. Null until an admin or
   * a completed report sets one. */
  currentTopicId: string | null;
  /** Whether a parent Strict Mode passcode has been set on this student. */
  strictModePasscodeSet: boolean;
  /** Whether the parent has turned Strict Mode ON. The app only auto-locks
   * near class time when this is true. */
  strictModeEnabled: boolean;
}

export interface Trainer extends User {
  role: 'trainer';
  title: string | null; // e.g. "Lead Web Architect"
}

/** One level within a Stage (admin-created), e.g. Scratch → "Level 2". */
export interface Level {
  id: string;
  stage: Stage;
  /** 1-based position within the Stage. */
  order: number;
  title: string;
  description: string | null;
}

/** One topic within a Level (admin-created), e.g. "Sprite Movement". */
export interface Topic {
  id: string;
  levelId: string;
  /** 1-based position within the Level. */
  order: number;
  title: string;
  description: string | null;
}

export interface LevelWithTopics extends Level {
  topics: Topic[];
}

/** A student on a class session, as shown to trainers/other students on it. */
export interface ClassSessionStudent {
  id: string; // the student's User.id
  firstName: string;
  lastName: string;
}

/**
 * One occurrence of a recurring ClassSchedule (what powers the schedule +
 * join + alarms). Every session on the same schedule shares the same
 * trainer, students, and Zoom link.
 */
export interface ClassSession {
  id: string;
  classScheduleId: string;
  title: string;
  trainerId: string;
  trainerName: string;
  /** The topic this occurrence covers, if the schedule set one. */
  topicId: string | null;
  /** Everyone booked on this session — one student for 1-on-1, several for group. */
  students: ClassSessionStudent[];
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: ClassStatus;
  zoomJoinUrl: string;
}

/** A student's progress through their current Stage (read model for the apps). */
export interface CurriculumProgress {
  studentId: string;
  /** Null if the student hasn't been placed on a topic yet. */
  currentStage: Stage | null;
  currentTopicId: string | null;
  currentLevelId: string | null;
  totalTopicsInStage: number;
  completedTopicIds: string[];
  /** 0–100, precomputed by the backend. */
  percentComplete: number;
  levels: LevelWithTopics[];
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
  topicId: string;
  /** True → backend auto-advances the student to the next topic/level/stage. */
  topicCompleted: boolean;
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
  topicId: string;
  topicCompleted: boolean;
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

/** Parent re-enters the admin-issued passcode to turn Strict Mode on/off. */
export interface ToggleStrictModeInput {
  passcode: string;
}

/* ------------------------------------------------------------------ */
/* Admin DTOs (admin console only — not used by mobile/trainer web)    */
/* ------------------------------------------------------------------ */

/** Admin → backend. Creates a user with a default password (lowercase surname). */
export interface AdminCreateUserInput {
  schoolId: SchoolId;
  role: Role;
  firstName: string;
  lastName: string;
  email?: string;
  // Student-only fields
  guardianName?: string;
  guardianEmail?: string; // required when role === 'student'
  /** Optional — where they start in the curriculum. Can be set later via a report. */
  startingTopicId?: string;
  // Optional, role === 'trainer' only
  title?: string;
}

export interface AdminCreateLevelInput {
  stage: Stage;
  /** 1-based position within the Stage. Must be unique per stage. */
  order: number;
  title: string;
  description?: string;
}

export interface AdminCreateTopicInput {
  levelId: string;
  /** 1-based position within the Level. Must be unique per level. */
  order: number;
  title: string;
  description?: string;
}

/**
 * Admin → backend. Creates a recurring booking AND generates every
 * individual ClassSession for the days in range immediately — capped at
 * 60 generated sessions per call.
 */
export interface AdminCreateClassScheduleInput {
  title: string;
  /** The trainer's User.id (from GET /admin/users), not the Trainer row's own id. */
  trainerUserId: string;
  /** One or more students — 1 for a 1-on-1, several for a group class. */
  studentUserIds: string[];
  /** 0 = Sunday … 6 = Saturday. At least one day required. */
  daysOfWeek: number[];
  /** "HH:mm" in the school's local time, e.g. "16:00". */
  startTime: string;
  durationMinutes: number;
  /** "YYYY-MM-DD". Can equal startDate to book a single day. */
  startDate: string;
  endDate: string;
  topicId?: string;
  zoomJoinUrl: string;
  /** Informational only — no automatic credit deduction, e.g. "Paid through Oct 2026". */
  paidThroughNote?: string;
}

export interface AdminCreateClassScheduleResponse {
  id: string;
  title: string;
  sessionsCreated: number;
  sessions: ClassSession[];
}

export interface AdminUpdateClassSessionInput {
  status: ClassStatus;
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
