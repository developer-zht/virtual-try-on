export const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

// baseURL 里已含 /api/v1（见 .env：QCLI_API_BASE_URL=https://veslune.aabbaq.com/api/v1）
// 所以这里的路径都不带 /api/v1
export const API = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/auth/me', // GET 取摘要 / PUT 更新基础资料
  },
  user: {
    profile: '/users/me/profile', // GET / PUT
    profileOptions: '/metadata/profile-options', // 枚举选项（无需鉴权）
    outfits: '/user/outfits', // GET 列表 / POST 保存
    outfitById: (id: string) => `/user/outfits/${id}`, // DELETE
    todayOutfit: '/user/today-outfit', // GET / PUT
  },
  wardrobe: {
    uploadUrl: '/wardrobe/upload-url', // 申请预签名直传地址
    upload: '/wardrobe/upload', // 确认上传、启动 AI 导入
    list: '/wardrobe', // GET，筛选参数是 category_en
    stats: '/wardrobe/stats',
    byId: (id: string) => `/wardrobe/${id}`, // GET / PUT / DELETE
    removeBackground: (id: string) => `/wardrobe/${id}/remove-background`, // 目前固定 501
  },
  outfits: {
    recommend: '/outfits/recommend',
    byId: (id: string) => `/outfits/${id}`,
  },
  tasks: { byId: (id: string) => `/tasks/${id}` },
  weather: { current: '/weather' },
  tryon: { create: '/tryon', resultById: (id: string) => `/tryon/results/${id}` }, // create 目前 501
} as const;

// health 特殊：没有 /api/v1 前缀，用完整地址或另建一个不带前缀的实例请求
export const HEALTH_URL = '/health';
