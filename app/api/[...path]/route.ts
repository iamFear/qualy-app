import { getApi } from '../../../server/runtime.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function handle(request: Request) {
  return getApi().handle(request);
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
