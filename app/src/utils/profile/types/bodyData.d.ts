import type { FieldError } from '@/utils/types/validators';

export type NumericDraftValue = number | string | null;

export interface ProfileBodySource {
  height: number | null;
  weight: number | null;
  gender: string | null;
  skinTone: string | null;
  bodyType: string | null;
  ageRange: string | null;
  hairStyle: string | null;
  hairColor: string | null;
  shoulderWidth: number | null;
  waist: number | null;
  hip: number | null;
  thigh: number | null;
  calf: number | null;
  legLength: number | null;
  footLength: number | null;
}

export interface BodyDataDraft {
  height: NumericDraftValue;
  weight: NumericDraftValue;
  gender: string | null;
  skinTone: string | null;
  bodyType: string | null;
  ageRange: string | null;
  hairStyle: string | null;
  hairColor: string | null;
  shoulderWidth: NumericDraftValue;
  waist: NumericDraftValue;
  hip: NumericDraftValue;
  thigh: NumericDraftValue;
  calf: NumericDraftValue;
  legLength: NumericDraftValue;
  footLength: NumericDraftValue;
}

type EnumField = 'gender' | 'skinTone' | 'bodyType' | 'ageRange' | 'hairStyle' | 'hairColor';

type OptionalNumberField =
  'shoulderWidth' | 'waist' | 'hip' | 'thigh' | 'calf' | 'legLength' | 'footLength';

export type BodyDataEnumCatalog = Partial<Record<EnumField, readonly string[]>>;
export type BodyDataValidationErrors = Partial<Record<keyof BodyDataDraft, FieldError>>;
