import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { getEnv } from './env';

/**
 * Cifrado simétrico de secretos guardados en base de datos:
 *  - llm_settings.api_key_ciphertext
 *  - training_participants.temp_password_ciphertext
 *
 * Formato almacenado: base64(iv).base64(authTag).base64(ciphertext)
 * Nunca sale del servidor. Ver docs/09-seguridad.md.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function getKey(): Buffer {
  return Buffer.from(getEnv().APP_ENCRYPTION_KEY, 'base64');
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Secreto cifrado con formato inválido');
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Enmascara una clave para mostrarla en la UI: solo los últimos 4 caracteres. */
export function last4(secret: string): string {
  return secret.length <= 4 ? secret : secret.slice(-4);
}
