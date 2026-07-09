function readEnv(name: string): string | undefined {
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>)[name];
  return fromImportMeta ?? process.env[name];
}

/** 必填变量：缺失或空串直接抛错（fail fast），返回非空字符串 */
export function requireEnv(name: string): string {
  const v = readEnv(name);
  if (!v) {
    throw new Error(
      `环境变量 ${name} 未配置：检查 app/.env.test.local 与 vitest.config.ts 的 env 设置`,
    );
  }
  return v;
}

/** 选填变量：缺失时用默认值 */
export function optionalEnv(name: string, fallback = ''): string {
  return readEnv(name) ?? fallback;
}
