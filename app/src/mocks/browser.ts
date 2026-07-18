import { setupWorker } from 'msw/browser';
import { handlers, setMockScenario, setMockWeather } from './handlers';
import { readMockScenarioFromBrowser } from './scenarios';

setMockScenario(readMockScenarioFromBrowser());
setMockWeather(
  typeof window === 'undefined'
    ? 'cloudy'
    : new URL(window.location.href).searchParams.get('mockWeather'),
);

export const worker = setupWorker(...handlers);
