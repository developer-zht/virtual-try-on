// src/api/config.js
export const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

// src/api/endpoints.js —— 路径集中一处，改名只改这里
export const API = {
  wardrobe: '/v1/wardrobe',
  profile: '/v1/user/profile',
  recommend: '/v1/outfits/recommend',
  tryon: '/v1/tryon',
};
