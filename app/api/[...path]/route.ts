import { createApi } from '../../../server/api.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let api: ReturnType<typeof createApi> | undefined;

function handle(request: Request) {
  api ??= createApi({
    origin: process.env.QUALY_ORIGIN ? new URL(process.env.QUALY_ORIGIN).origin : undefined,
  });
  return api.handle(request);
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
