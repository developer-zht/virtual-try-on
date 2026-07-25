import type { ProfileState } from '../../stores/types/profile';

export interface PreferenceDraft {
  styles: string[];
  colors: string[];
}

export function createPreferenceDraft(profile: ProfileState): PreferenceDraft {
  return {
    styles: [...profile.styles],
    colors: [...profile.colors],
  };
}

function sameSelection(left: readonly string[], right: readonly string[]): boolean {
  const leftValues = new Set(left);
  const rightValues = new Set(right);

  return (
    leftValues.size === rightValues.size && [...leftValues].every((value) => rightValues.has(value))
  );
}

export function isPreferenceDraftDirty(draft: PreferenceDraft, initial: PreferenceDraft): boolean {
  return (
    !sameSelection(draft.styles, initial.styles) || !sameSelection(draft.colors, initial.colors)
  );
}

export function createPreferenceCandidate(
  confirmedProfile: ProfileState,
  draft: PreferenceDraft,
): ProfileState {
  return {
    ...confirmedProfile,
    styles: [...draft.styles],
    colors: [...draft.colors],
  };
}
