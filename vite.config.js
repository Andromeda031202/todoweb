import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:7070',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from:', req.method, req.url, proxyRes.statusCode);
          });
        }
      },
      '/auth': {
        target: 'http://localhost:7070',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, '/api/auth')
      },
      '/users': {
        target: 'http://localhost:7070',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/users/, '/api/users')
      },
      '/projects': {
        target: 'http://localhost:7070',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/projects/, '/api/projects')
      },
      '/tasks': {
        target: 'http://localhost:7070',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tasks/, '/api/tasks')
      },
      '/ping': {
        target: 'http://localhost:7070',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ping/, '/api/ping')
      }
    }
  },
  base: '/',
  preview: {
    port: 5174
  }
})
