import { createServer } from 'http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { appendFile, mkdir } from 'fs/promises';

// ESM 里没有现成的 __dirname，用 import.meta.url 反推"脚本所在目录"
const __dirname = dirname(fileURLToPath(import.meta.url)); // 例如 <项目根>/tools
const logDir = join(__dirname, '..', 'log'); // 脚本在 tools/，上一级 '..' 就是项目根

await mkdir(logDir, { recursive: true }); // 建 log 目录（相对"你跑命令时所在目录"），已存在也不报错

createServer((req, res) => {
  // 每来一个请求跑一次
  if (req.method === 'POST' && req.url === '/log') {
    // 只收 "POST /log"（URL 路由，≠ 磁盘的 log/）
    let body = '';
    req.on('data', (c) => (body += c)); // 请求体分块流入，逐块拼接
    req.on('end', async () => {
      // 收完整了
      await appendFile(join(logDir, 'frontend.log'), body + '\n'); // 追加成一行写进 log/frontend.log（磁盘文件）
      res.writeHead(204);
      res.end(); // 回 204（成功无内容）
    });
  } else {
    res.writeHead(404);
    res.end();
  } // 其它一律 404
}).listen(4000, () => console.log('log server on :4000')); // 监听 4000（= LOG_ENDPOINT 的端口）
