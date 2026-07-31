import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // next-env.d.ts lo genera Next en cada arranque; no se edita ni se revisa.
    ignores: ['.next/**', 'node_modules/**', 'src/db/migrations/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
