/**
 * Server-side counterpart to `packages/shared/src/api.ts`'s `ApiError`.
 * Every error response MUST use this shape — the client's `createApiClient`
 * parses exactly this envelope. Do not throw raw Express errors.
 */

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'invalid_credentials'
  | 'password_change_required'
  | 'server_error';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation_error: 400,
  invalid_credentials: 401,
  password_change_required: 403,
  server_error: 500,
};

export class HttpApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'HttpApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  toBody() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}
