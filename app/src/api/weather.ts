import { API } from './_configs/url';
import { request } from './request';
import type { Weather, WeatherQuery } from './types/weather';

/** 获取天气（需登录） */
export function getWeather(query: WeatherQuery = {}): Promise<Weather> {
  return request<Weather>({
    url: API.weather.current,
    method: 'GET',
    params: query,
  });
}
