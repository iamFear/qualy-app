import { cache } from 'react';
import { headers } from 'next/headers';
import { getApi } from '../server/runtime.ts';

export const requestAccount = cache(async () => {
  const cookie = (await headers()).get('cookie');
  return getApi().getAccount(cookie);
});
