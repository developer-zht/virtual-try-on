import { optionalEnv, requireEnv } from './env';

export const BASE_URL = requireEnv('VITE_API_BASE_URL');
export const EMAIL = requireEnv('VITE_TEST_EMAIL');
export const PASSWORD = requireEnv('VITE_TEST_PASSWORD');
export const NICKNAME = optionalEnv('VITE_TEST_NICKNAME', 'tester');
