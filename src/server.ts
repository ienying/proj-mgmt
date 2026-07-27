import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.timeout = 120_000;           // 2 分钟 socket 超时
  server.keepAliveTimeout = 65_000;   // 65s 空闲连接关闭（略大于常见 60s LB 超时）
  server.headersTimeout = 30_000;     // 30s 等待请求头
  server.requestTimeout = 120_000;    // 2 分钟请求超时（Schema 同步等慢操作留足时间）
  server.on('connection', (socket) => {
    socket.on('close', () => {
      console.log(`[conn] socket closed, remote=${socket.remoteAddress}:${socket.remotePort}`);
    });
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});
