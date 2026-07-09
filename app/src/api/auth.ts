// 字段抽取集中一处：后端改名只改这里（解决"满项目找 access_token"）
export function extractAccessToken(json: unknown): string | undefined {
  const j = json as { data?: { access_token?: unknown }; access_token?: unknown };
  const t = j?.data?.access_token ?? j?.access_token;
  return typeof t === 'string' ? t : undefined; // 类型校验，非 string 视作没有
}
