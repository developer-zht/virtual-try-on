import { extractAccessToken } from '@/api/auth';

export async function getTestToken(
  baseUrl: string,
  email: string,
  password: string,
  nickname: string,
): Promise<string> {
  console.log(baseUrl);

  const registerRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nickname }),
  });
  const accountReady =
    registerRes.status === 409 || (registerRes.status >= 200 && registerRes.status < 300);
  if (!accountReady) throw new Error(`注册失败: HTTP ${registerRes.status}`);

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const text = await loginRes.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    console.log(err);
    throw new Error('login 返回非 JSON');
  }

  const token = extractAccessToken(json);
  if (!token) throw new Error('登录成功但没解析到 token —— 看上面 login body，改一下取值路径');
  console.log('\n拿到 token:', token.slice(0, 20) + '…');

  return token;
}
