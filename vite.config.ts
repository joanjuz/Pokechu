import { defineConfig } from 'vitest/config';
export default defineConfig({
  base: process.env.BASE_PATH || '/PokeJuegos/',
  test: { include: ['tests/unit/**/*.test.ts'] },
});
