export interface HFEngineErrorPayload {
  ok: false;
  source: 'hf_engine';
  endpoint: string;
  message: string;
  status: number;
  details?: unknown;
  reason?: string;
}

export interface HFDataResponse<T = unknown> {
  data: T;
  success: boolean;
  error?: HFEngineErrorPayload;
}


