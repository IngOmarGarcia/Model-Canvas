import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

import { authConfig } from '@/server/auth.config';

const { auth } = NextAuth(authConfig);

const CHANGE_PASSWORD_PATH = '/cambiar-contrasena';

/**
 * Guard de navegación (conveniencia, no control de acceso: la autorización real
 * la aplican requireRole() y cada Server Action / route handler).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const isLogin = pathname === '/login';
  const isChangePassword = pathname === CHANGE_PASSWORD_PATH;

  if (!user) {
    if (isLogin) return NextResponse.next();
    const url = new URL('/login', req.nextUrl);
    if (pathname !== '/') url.searchParams.set('redirigir', pathname);
    return NextResponse.redirect(url);
  }

  const home = user.role === 'facilitator' ? '/f' : '/p/lienzo';

  // Contraseña temporal: no se puede navegar a nada más hasta cambiarla.
  if (user.mustChangePassword && !isChangePassword) {
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.nextUrl));
  }

  if (!user.mustChangePassword && isChangePassword) {
    return NextResponse.redirect(new URL(home, req.nextUrl));
  }

  if (isLogin || pathname === '/') {
    return NextResponse.redirect(new URL(home, req.nextUrl));
  }

  // Coincidencia por SEGMENTO, no por prefijo de texto: "/presentacion" empieza
  // por "/p" y con startsWith se trataba como área de participante.
  const inArea = (base: string) => pathname === base || pathname.startsWith(`${base}/`);

  const needsFacilitator = inArea('/f') || inArea('/presentacion');
  const needsParticipant = inArea('/p');

  if (needsFacilitator && user.role !== 'facilitator') {
    return NextResponse.redirect(new URL(home, req.nextUrl));
  }

  if (needsParticipant && user.role !== 'participant') {
    return NextResponse.redirect(new URL(home, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
