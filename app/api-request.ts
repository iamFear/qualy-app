import type { PlannerState } from '../lib/models.ts';

type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export function request(path: '/api/state'): Promise<PlannerState>;
export function request(path: string, method: WriteMethod, body?: object): Promise<void>;
export async function request(path: string, method: WriteMethod | 'GET' = 'GET', body: object = {}): Promise<PlannerState | void> {
  const response = await fetch(path, method === 'GET' ? { cache: 'no-store' } : {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Qualy-Request': '1' },
    body: JSON.stringify(body),
  }).catch(() => null);
  const value: unknown = await response?.json().catch(() => null);
  if (!response?.ok || !value) {
    const message = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : undefined;
    throw new ApiError(message ?? 'No pudimos conectar con Qualy. Intenta de nuevo.', response?.status);
  }
  if (method === 'GET') return value as PlannerState;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.';
}
