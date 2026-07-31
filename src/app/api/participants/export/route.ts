import { listStoredCredentials } from '@/server/services/participants.service';
import { getWorkspaceContext } from '@/server/services/context.service';
import { getCurrentUser } from '@/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Prefijo defensivo contra inyección de fórmulas en Excel/Sheets: una celda que
 * empieza por = + - @ se ejecutaría al abrir el archivo.
 */
function csvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** Descarga del CSV de credenciales. Solo el facilitador dueño de la capacitación. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'facilitator') {
    return new Response('No autorizado', { status: 401 });
  }

  const context = await getWorkspaceContext(user);
  if (!context.trainingSessionId) {
    return new Response('Sin capacitación activa', { status: 404 });
  }

  let credentials;
  try {
    credentials = await listStoredCredentials(user, context.trainingSessionId);
  } catch {
    return new Response('No encontrado', { status: 404 });
  }

  const header = ['nombre', 'usuario', 'contrasena'].map(csvCell).join(',');
  const body = credentials
    .map((c) => [c.fullName, c.username, c.password].map(csvCell).join(','))
    .join('\r\n');

  // BOM para que Excel en Windows respete los acentos.
  const csv = `﻿${header}\r\n${body}\r\n`;

  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="credenciales-${fecha}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
