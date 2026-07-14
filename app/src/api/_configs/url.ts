export const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

// baseURL 里已含 /api/v1（见 .env：QCLI_API_BASE_URL=https://veslune.aabbaq.com/api/v1）
export const API = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh', // ⚠️ v1.8 无 refresh；http.ts 若有 401-refresh 那段也是死的，另行清理
    me: '/auth/me',
  },
  user: {
    profile: '/users/me/profile',
    // profileOptions 已删（后端移除 /metadata/profile-options）→ 见下面 metadata.enums
    model: '/users/me/model',
    outfits: '/user/outfits',
    outfitById: (id: string) => `/user/outfits/${id}`,
    todayOutfit: '/user/today-outfit',
  },
  metadata: {
    enums: '/metadata/enums', // 全量枚举字典，无需鉴权
  },
  wardrobe: {
    uploadUrl: '/wardrobe/upload-url',
    upload: '/wardrobe/upload',
    list: '/wardrobe',
    stats: '/wardrobe/stats',
    byId: (id: string) => `/wardrobe/${id}`,
    removeBackground: (id: string) => `/wardrobe/${id}/remove-background`,
  },
  outfits: {
    recommend: '/outfits/recommend',
    byId: (id: string) => `/outfits/${id}`,
  },
  tasks: { byId: (id: string) => `/tasks/${id}` },
  weather: { current: '/weather' },
  tryon: {
    create: '/tryon',
    full: '/tryon/full',
    resultById: (id: string) => `/tryon/results/${id}`,
    outfitById: (id: string) => `/tryon/outfits/${id}`,
  },
} as const;

export const HEALTH_URL = '/health';
