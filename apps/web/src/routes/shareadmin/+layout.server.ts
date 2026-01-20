import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { isAdminEnabled, validateSession, getSessionCookieName } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  // If admin is not enabled (no password set), return 404
  if (!isAdminEnabled()) {
    throw redirect(302, '/');
  }

  // Check if on login page
  const isLoginPage = url.pathname === '/shareadmin/login';

  // Get session token from cookie
  const sessionToken = cookies.get(getSessionCookieName());
  const isAuthenticated = validateSession(sessionToken);

  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && !isLoginPage) {
    throw redirect(302, '/shareadmin/login');
  }

  // If authenticated and on login page, redirect to admin
  if (isAuthenticated && isLoginPage) {
    throw redirect(302, '/shareadmin');
  }

  return {
    isAuthenticated,
  };
};
