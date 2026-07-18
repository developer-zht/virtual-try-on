export const MOCK_SCENARIOS = [
  'visitor',
  'profile-incomplete',
  'model-generating',
  'wardrobe-empty',
  'ready-to-generate',
  'recommendation-loading',
  'tryon-loading',
  'tryon-failed',
  'ready-today',
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const DEFAULT_MOCK_SCENARIO: MockScenario = 'ready-today';
export const MOCK_SCENARIO_STORAGE_KEY = 'veslune:mock-scenario';

export function normalizeMockScenario(value: unknown): MockScenario {
  return typeof value === 'string' && MOCK_SCENARIOS.includes(value as MockScenario)
    ? (value as MockScenario)
    : DEFAULT_MOCK_SCENARIO;
}

export function readMockScenarioFromBrowser(): MockScenario {
  if (typeof window === 'undefined') return DEFAULT_MOCK_SCENARIO;
  const queryScenario = new URL(window.location.href).searchParams.get('mockScenario');
  const storedScenario = window.localStorage.getItem(MOCK_SCENARIO_STORAGE_KEY);
  const scenario = normalizeMockScenario(queryScenario ?? storedScenario);
  window.localStorage.setItem(MOCK_SCENARIO_STORAGE_KEY, scenario);
  return scenario;
}
