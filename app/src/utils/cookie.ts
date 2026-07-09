export function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''; // SSR 守卫

  const row = document.cookie.split(';').find((item) => item.startsWith(name + '='));
  if (!row) return '';

  const index = row.indexOf('=');
  return decodeURIComponent(row.slice(index + 1)); // 从第一个 = 之后全取，避免值里含 = 被截断
}
