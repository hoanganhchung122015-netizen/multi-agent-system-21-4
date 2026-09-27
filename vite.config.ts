import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Nạp toàn bộ biến môi trường từ file .env local hoặc hệ thống
  const env = loadEnv(mode, process.cwd(), '');

  // Cấu hình nạp linh hoạt 4 API Keys (Đọc cả VITE_ lẫn GEMINI_)
  const k1 = env.VITE_GEMINI_API_KEY_1 || env.GEMINI_API_KEY_1 || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
  const k2 = env.VITE_GEMINI_API_KEY_2 || env.GEMINI_API_KEY_2 || '';
  const k3 = env.VITE_GEMINI_API_KEY_3 || env.GEMINI_API_KEY_3 || '';
  const k4 = env.VITE_GEMINI_API_KEY_4 || env.GEMINI_API_KEY_4 || '';

  // Gán vào process.env của Node.js Server môi trường Dev
  process.env.GEMINI_API_KEY_1 = k1;
  process.env.GEMINI_API_KEY_2 = k2;
  process.env.GEMINI_API_KEY_3 = k3;
  process.env.GEMINI_API_KEY_4 = k4;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'gemini-api-dev-server',
        configureServer(server) {
          // Chỉ nạp động (dynamic import) handler khi chạy dev local, tránh làm lỗi quá trình Build Vercel
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/gemini')) {
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                return;
              }

              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsedBody = body ? JSON.parse(body) : {};

                  process.env.GEMINI_API_KEY_1 = k1;
                  process.env.GEMINI_API_KEY_2 = k2;
                  process.env.GEMINI_API_KEY_3 = k3;
                  process.env.GEMINI_API_KEY_4 = k4;

                  const vercelReq: any = {
                    method: req.method,
                    body: parsedBody,
                    headers: req.headers,
                    query: {}
                  };

                  const vercelRes: any = {
                    status(code: number) {
                      res.statusCode = code;
                      return this;
                    },
                    json(data: any) {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    },
                    send(data: any) {
                      res.end(data);
                    },
                    end() {
                      res.end();
                    }
                  };

                  // Import động để cách ly hoàn toàn với luồng Build trên Vercel
                  const geminiModule = await import('./api/gemini');
                  const handler = geminiModule.default || geminiModule;
                  await handler(vercelReq, vercelRes);

                } catch (err: any) {
                  console.error("Lỗi Middleware Gemini Dev Server:", err);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Server error' }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY_1': JSON.stringify(k1),
      'process.env.GEMINI_API_KEY_2': JSON.stringify(k2),
      'process.env.GEMINI_API_KEY_3': JSON.stringify(k3),
      'process.env.GEMINI_API_KEY_4': JSON.stringify(k4),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
