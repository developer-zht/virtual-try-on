/** GET /weather 的可选 query（都不传就用用户自己的 city_code） */
export interface WeatherQuery {
  city_code?: string; // 和风城市 ID
  lat?: number; // 预留
  lng?: number; // 预留
}

/** GET /weather 的 data */
export interface Weather {
  city: string;
  city_code: string;
  temp: number;
  feels_like: number;
  condition: string; // 中文 "晴"
  condition_en: string; // 英文 "Sunny"
  humidity: number;
  season: string; // 中文 "春"
  season_en: string; // 英文 "Spring"
  updated_at: string;
}
