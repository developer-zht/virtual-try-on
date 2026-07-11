// 全站路由名的单一数据源（和 constants/storage.ts 的 STORAGE_KEYS 一个思路）。
// 约定：key 用 camelCase（JS 习惯），value 是路由真正的 name 字符串，必须和 routes.ts 完全一致。
export const ROUTES = {
  welcome: 'welcome',
  home: 'home',
  scan: 'scan',
  profileForm: 'profile-form',
  settings: 'settings',
  result: 'result',
  workshop: 'workshop',
  profileDetail: 'profile-detail',
  wardrobe: 'wardrobe',
  preference: 'preference',
  profile: 'profile',
  login: 'login', // ← 新增：http.ts 401 跳转用它
} as const;

// as const 让每个 value 变成「字面量类型」（'welcome' 而不是宽泛的 string），
// 于是 RouteName 就是这 12 个字面量的联合类型 —— 传错名字编译期就红。
export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
