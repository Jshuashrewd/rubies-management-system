/**
 * Typed API client shared by the mobile (Person A) and web apps.
 * Also serves as living documentation of the endpoints Person B implements.
 *
 * Uses the global `fetch` (available in React Native, Next.js, and Node 20+).
 */
import type {
  ApiErrorBody,
  ApiErrorCode,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ClassSession,
  CreateReportInput,
  CurriculumProgress,
  CurriculumStage,
  JoinEvent,
  LogJoinInput,
  LoginRequest,
  LoginResponse,
  Report,
  Student,
  StrictModeActivateInput,
  StrictModeEvent,
  StrictModeReleaseInput,
  User,
  VerifyPasscodeInput,
  VerifyPasscodeResponse,
} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody | null) {
    const code = body?.error?.code ?? 'server_error';
    super(body?.error?.message ?? `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = body?.error?.details;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current auth token (or null). Called before each request. */
  getToken?: () => string | null | Promise<string | null>;
  /** Called on any 401 response (e.g. to force logout). */
  onUnauthorized?: () => void;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, getToken, onUnauthorized } = options;
  const root = baseUrl.replace(/\/$/, '');

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = getToken ? await getToken() : null;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${root}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) onUnauthorized?.();

    if (!res.ok) {
      let parsed: ApiErrorBody | null = null;
      try {
        parsed = (await res.json()) as ApiErrorBody;
      } catch {
        // non-JSON error body — leave parsed null
      }
      throw new ApiError(res.status, parsed);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    auth: {
      login: (b: LoginRequest) => request<LoginResponse>('POST', '/auth/login', b),
      changePassword: (b: ChangePasswordRequest) =>
        request<ChangePasswordResponse>('POST', '/auth/change-password', b),
    },

    /** Current authenticated user. */
    me: () => request<User>('GET', '/me'),

    schedule: {
      /** Classes for the current user (student: enrolled, trainer: assigned). */
      list: () => request<ClassSession[]>('GET', '/schedule'),
      get: (classId: string) => request<ClassSession>('GET', `/classes/${classId}`),
    },

    curriculum: {
      stages: () => request<CurriculumStage[]>('GET', '/curriculum/stages'),
      /** Omit studentId for the current student; pass it for a trainer view. */
      progress: (studentId?: string) =>
        request<CurriculumProgress>(
          'GET',
          studentId
            ? `/curriculum/progress?studentId=${encodeURIComponent(studentId)}`
            : '/curriculum/progress',
        ),
    },

    students: {
      /** Trainer: the students assigned to the current trainer. */
      assigned: () => request<Student[]>('GET', '/trainer/students'),
      get: (studentId: string) => request<Student>('GET', `/students/${studentId}`),
    },

    reports: {
      create: (b: CreateReportInput) => request<Report>('POST', '/reports', b),
      list: (params?: { studentId?: string; classId?: string }) => {
        const parts: string[] = [];
        if (params?.studentId)
          parts.push(`studentId=${encodeURIComponent(params.studentId)}`);
        if (params?.classId)
          parts.push(`classId=${encodeURIComponent(params.classId)}`);
        const qs = parts.length ? `?${parts.join('&')}` : '';
        return request<Report[]>('GET', `/reports${qs}`);
      },
    },

    events: {
      /** Log a join tap (attendance signal); also cancels pending class alarms. */
      join: (b: LogJoinInput) => request<JoinEvent>('POST', '/events/join', b),
      strictModeActivate: (b: StrictModeActivateInput) =>
        request<StrictModeEvent>('POST', '/events/strict-mode/activate', b),
      strictModeRelease: (b: StrictModeReleaseInput) =>
        request<StrictModeEvent>('POST', '/events/strict-mode/release', b),
    },

    strictMode: {
      verifyPasscode: (b: VerifyPasscodeInput) =>
        request<VerifyPasscodeResponse>('POST', '/strict-mode/verify-passcode', b),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
