import type { Weather } from '@/api/types/weather';
import { getWeather } from '@/api/weather'; // 你 API 层已有 weather.ts
import { ref } from 'vue';

// TODO
export function useWeather() {
  const weather = ref<Weather | null>(null);
  const load = async () => {
    weather.value = await getWeather();
  };
  return { weather, load };
}
