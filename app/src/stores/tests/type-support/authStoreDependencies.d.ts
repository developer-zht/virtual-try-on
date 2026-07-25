import type { LoginRaw } from '@/api/types/login';

export declare function login(email: string, password: string): Promise<LoginRaw>;
export declare function getMe(): Promise<LoginRaw['user']>;

export declare const STORAGE_KEYS: {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly csrfToken: string;
};
