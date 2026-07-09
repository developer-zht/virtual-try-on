// auth-me.check.mjs —— /auth/me 冒烟测试（无需 UI）
// 跑法：
//   node auth-me.check.mjs
// 或指定环境变量：
//   API_BASE_URL=http://localhost:8080/api/v1 TEST_EMAIL=you@x.com TEST_PASSWORD=xxx node auth-me.check.mjs
// 依赖：Node 18+（自带全局 fetch），无需 npm install。

const BASE = 'https://veslune.aabbaq.com/api/v1';
const EMAIL = 'laogeen@gmail.com';
const PASSWORD = 'laogen12345';
const NICKNAME = 'laogen';

async function call(name, url, init) {
  const res = await fetch(url, init);
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  console.log(`\n[${name}] ${init?.method || 'GET'} ${url}`);
  console.log('  status:', res.status);
  console.log('  body  :', JSON.stringify(body, null, 2));
  return { res, body };
}

async function main() {
  // 1) 注册：首次 2xx；已注册后端直接返回 409 —— 两者都当"账号已就绪"
  const { res: regRes } = await call('register', `${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, nickname: NICKNAME }),
  });
  const accountReady = regRes.status === 409 || (regRes.status >= 200 && regRes.status < 300);
  if (!accountReady) throw new Error(`注册失败: HTTP ${regRes.status}`);

  // 2) 登录拿 token
  const { body: loginBody } = await call('login', `${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token =
    loginBody?.data?.token ??
    loginBody?.data?.access_token ??
    loginBody?.token ??
    loginBody?.access_token;
  if (!token) throw new Error('登录成功但没解析到 token —— 看上面 login body，改一下取值路径');
  console.log('\n拿到 token:', token.slice(0, 20) + '…');

  // 3) 带 token 请求 /auth/me
  const { res: meRes } = await call('auth/me', `${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (meRes.status !== 200) throw new Error(`/auth/me 返回 ${meRes.status}，未通过`);
  console.log('\n✅ /auth/me 测试通过');
}

main().catch((e) => {
  console.error('\n❌ 测试失败:', e.message);
  process.exitCode = 1;
});
