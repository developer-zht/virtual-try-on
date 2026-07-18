import { ref } from 'vue';
export type ThemeName = 'default' | 'lunar';
const THEME_KEY = 'vc_theme';
const current = ref<ThemeName>('default'); // 模块级 → 全 app 共享
function apply(name: ThemeName) {
  current.value = name;
  const root = document.documentElement;
  if (name === 'default') delete root.dataset.theme;
  else root.dataset.theme = name;
  localStorage.setItem(THEME_KEY, name);
}
export function useTheme() {
  function init() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'default' || saved === 'lunar') {
      apply(saved);
    } else {
      apply('default');
    }
  }
  function set(name: ThemeName) {
    apply(name);
  }
  function toggle() {
    apply(current.value === 'lunar' ? 'default' : 'lunar');
  }
  return { current, init, set, toggle };
}
