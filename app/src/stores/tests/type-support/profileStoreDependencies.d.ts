import type { Ref } from 'vue';
import type { Profile, ProfilePatch } from '../../../api/types/profile';

export interface EnumItem {
  value: string;
  label_zh: string;
  label_en: string;
}

export interface EnumsAll {
  types: Record<string, EnumItem[]>;
  loaded_at: string;
}

export interface FieldError {
  code: string;
  message: string;
}

export declare function getProfile(): Promise<Profile>;
export declare function updateProfile(patch: ProfilePatch): Promise<Profile>;
export declare function getEnums(): Promise<EnumsAll>;
export declare function validateEmail(value: string): FieldError | null;
export declare function validatePassword(value: string): FieldError | null;
export declare function validateHeight(value: number | null): FieldError | null;
export declare function validateWeight(value: number | null): FieldError | null;
export declare function _runAsync<T>(
  fn: () => Promise<T>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
): Promise<T | null>;
