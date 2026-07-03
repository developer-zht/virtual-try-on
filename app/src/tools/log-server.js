import { createServer } from 'http';
import { appendFile, mkdir } from 'fs/promises';
await mkdir('log', { recursive: true });

createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      await appendFile('log/frontend.log', body + '\n'); // ← 写到项目根 log/
      res.writeHead(204);
      res.end();
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(4000, () => console.log('log server on http://localhost:4000'));
