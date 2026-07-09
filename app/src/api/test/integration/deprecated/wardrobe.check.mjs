// wardrobe.check.mjs —— GET /wardrobe 冒烟测试（纯 node，无框架）
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

async function getToken() {
  await call('register', `${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, nickname: NICKNAME }),
  });
  const { body } = await call('login', `${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token = body?.data?.access_token; // v1.4 确认：token 在 data.access_token
  if (!token) throw new Error('登录未拿到 access_token');
  return token;
}

async function main() {
  const token = await getToken();
  const auth = { Authorization: `Bearer ${token}` };

  const { res, body } = await call('wardrobe', `${BASE}/wardrobe?limit=20`, { headers: auth });
  if (res.status !== 200) throw new Error(`/wardrobe 返回 ${res.status}`);
  const items = body?.data?.items;
  if (!Array.isArray(items)) throw new Error('data.items 不是数组');
  console.log(`\n✅ /wardrobe 通过，返回 ${items.length} 件`);

  const { res: res2 } = await call('wardrobe?TOPS', `${BASE}/wardrobe?category_en=TOPS`, {
    headers: auth,
  });
  if (res2.status !== 200) throw new Error(`分类筛选返回 ${res2.status}`);
  console.log('✅ category_en=TOPS 筛选通过');
}

main().catch((e) => {
  console.error('\n❌ 测试失败:', e.message);
  process.exitCode = 1;
});
