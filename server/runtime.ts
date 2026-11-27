import { createApi } from './api.ts';

let api: ReturnType<typeof createApi> | undefined;

export function getApi() {
  api ??= createApi({
    origin: process.env.QUALY_ORIGIN ? new URL(process.env.QUALY_ORIGIN).origin : undefined,
  });
  return api;
}
