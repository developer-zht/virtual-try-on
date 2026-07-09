import { defineBoot } from '#q-app';

export default defineBoot(async () => {
  if (import.meta.env.DEV) {
    /* worker.start() */
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
});
