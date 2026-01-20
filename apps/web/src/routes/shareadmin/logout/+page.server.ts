import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { destroySession, getSessionCookieName } from '$lib/server/admin';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const sessionToken = cookies.get(getSessionCookieName());
    if (sessionToken) {
      destroySession(sessionToken);
    }

    cookies.delete(getSessionCookieName(), { path: '/shareadmin' });

    throw redirect(302, '/shareadmin/login');
  },
};
