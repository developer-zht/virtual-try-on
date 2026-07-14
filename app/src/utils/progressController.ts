import type { Ref } from 'vue';

export function runFakeProgress(progress: Ref<number>) {
  let timer: ReturnType<typeof setTimeout>;

  function updateProgress() {
    const limit: number = 90;
    if (progress.value >= limit) return;

    // 越往后速度越慢
    const remain = 90 - progress.value;

    const delta = Math.round(Math.max(Math.random() * remain * 0.15, 0.5));

    progress.value = Math.min(progress.value + delta, limit);

    timer = setTimeout(updateProgress, 100 + Math.random() * 5600);
  }

  updateProgress();

  return {
    stop() {
      clearTimeout(timer);
    },
  };
}
