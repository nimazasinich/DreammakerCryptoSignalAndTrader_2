import { Response } from 'express';

export type ErrorReason =
  | 'NOT_IMPLEMENTED'
  | 'INVALID_CONFIG'
  | 'HF_ENGINE_ERROR'
  | 'UPSTREAM_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export interface ErrorResponsePayload {
  ok: false;
  source: string;
  reason: ErrorReason | string;
  message: string;
  status?: number;
  details?: unknown;
}

export const createErrorResponse = ({
  source = 'system',
  reason = 'UNKNOWN',
  message,
  status,
  details
}: {
  source?: string;
  reason?: ErrorReason | string;
  message: string;
  status?: number;
  details?: unknown;
}): ErrorResponsePayload => ({
  ok: false,
  source,
  reason,
  message,
  status,
  details
});

export const sendErrorResponse = (
  res: Response,
  status: number,
  params: Parameters<typeof createErrorResponse>[0]
) => res.status(status).json(createErrorResponse({ ...params, status }));


