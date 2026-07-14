import type { Weather } from '@/api/types/weather';
import { getWeather } from '@/api/weather'; // 你 API 层已有 weather.ts
import { ref } from 'vue';

export function useWeather() {
  const weather = ref<Weather | null>(null); // 响应式天气（初始 null）
  const load = async () => {
    weather.value = await getWeather();
  }; // 拉一次填进去
  return { weather, load }; // 交给组件：weather 绑模板、load 触发
}
