export type BillkitErrorCode =
  | 'auth'
  | 'permission'
  | 'not_found'
  | 'validation'
  | 'offline'
  | 'conflict'
  | 'network';

export class BillkitError extends Error {
  readonly code: BillkitErrorCode;

  constructor(message: string, code: BillkitErrorCode) {
    super(message);
    this.name = 'BillkitError';
    this.code = code;
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
