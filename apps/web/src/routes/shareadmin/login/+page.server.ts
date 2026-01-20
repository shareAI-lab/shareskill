import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { validatePassword, createSession, getSessionCookieName, getSessionMaxAge } from '$lib/server/admin';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const password = formData.get('password') as string;

    if (!password) {
      return fail(400, { error: 'Password is required' });
    }

    if (!validatePassword(password)) {
      return fail(401, { error: 'Invalid password' });
    }

    const sessionToken = createSession();
    cookies.set(getSessionCookieName(), sessionToken, {
      path: '/shareadmin',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: getSessionMaxAge(),
    });

    throw redirect(302, '/shareadmin');
  },
};
