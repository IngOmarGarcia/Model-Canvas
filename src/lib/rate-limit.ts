import type { UserRole } from '@/db/schema/enums';

/**
 * Límites de inicio de sesión (docs/09). La respuesta al usuario es siempre la
 * misma ("usuario o contraseña incorrectos"), tanto si la credencial es mala
 * como si está bloqueada: no se revela cuál de las dos ocurre.
 */
export const LOGIN_WINDOW_MS = 15 * 60_000;

export const LOGIN_LIMITS = {
  perUsername: 10,
  perIp: 30,
} as const;

/**
 * Límites de análisis por usuario (docs/08).
 * Los análisis servidos desde caché NO consumen cuota: solo se cuentan las
 * filas creadas, y la caché no crea ninguna.
 */
export const ANALYSIS_LIMITS: Record<UserRole, { perHour: number; perDay: number }> = {
  participant: { perHour: 5, perDay: 20 },
  facilitator: { perHour: 20, perDay: 100 },
};

export interface RateLimitVerdict {
  allowed: boolean;
  /** Segundos que faltan para poder reintentar. */
  retryAfterSeconds: number;
  message?: string;
}

export function evaluateRateLimit(
  role: UserRole,
  usedLastHour: number,
  usedLastDay: number,
  oldestInHour: Date | null,
): RateLimitVerdict {
  const limits = ANALYSIS_LIMITS[role];

  if (usedLastDay >= limits.perDay) {
    return {
      allowed: false,
      retryAfterSeconds: 3600,
      message: `Alcanzaste el límite de ${limits.perDay} análisis por día.`,
    };
  }

  if (usedLastHour >= limits.perHour) {
    // Ventana deslizante: se libera cuota cuando el más antiguo cumple una hora.
    const releasesAt = oldestInHour ? oldestInHour.getTime() + 3_600_000 : Date.now() + 3_600_000;
    const seconds = Math.max(60, Math.ceil((releasesAt - Date.now()) / 1000));

    return {
      allowed: false,
      retryAfterSeconds: seconds,
      message: `Alcanzaste el límite de ${limits.perHour} análisis por hora. Vuelve a intentarlo en ${Math.ceil(seconds / 60)} min.`,
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
