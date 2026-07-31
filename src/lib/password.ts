import 'server-only';

import { hash, verify } from '@node-rs/argon2';
import { randomInt } from 'node:crypto';

/**
 * Hash de contraseñas con Argon2id y generación de credenciales temporales.
 * Ver docs/09-seguridad.md.
 */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain);
  } catch {
    // Hash corrupto o de otro algoritmo: se trata como credencial inválida.
    return false;
  }
}

/** Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para dictar credenciales en voz alta. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const TEMP_PASSWORD_LENGTH = 10;

export function generateTempPassword(length = TEMP_PASSWORD_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Marcas diacríticas combinantes (acentos) que deja `normalize('NFD')`. */
const DIACRITICS = /[̀-ͯ]/g;

/**
 * "María de la Cruz Pérez" → "maria.perez"
 * Quita acentos, signos y palabras de enlace. El llamador resuelve colisiones
 * añadiendo un sufijo numérico (ver withSuffix).
 */
export function generateUsername(fullName: string): string {
  const stopwords = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'van', 'von']);

  const parts = fullName
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopwords.has(w));

  if (parts.length === 0) return 'participante';
  if (parts.length === 1) return parts[0];

  return `${parts[0]}.${parts[parts.length - 1]}`;
}

export function withSuffix(username: string, n: number): string {
  return n <= 1 ? username : `${username}${n}`;
}
