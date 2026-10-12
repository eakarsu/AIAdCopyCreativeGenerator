import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ include: /\.(jsx|js|tsx|ts)$/ })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.(jsx?|tsx?)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT, 10) || 3800,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3801}`,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (upstream, req, res) => {
            const abort = () => upstream.destroy();
            req.once('aborted', abort);
            res.once('close', () => { if (!res.writableEnded) abort(); });
            if (req.aborted || res.destroyed) abort();
          });
        },
      },
    },
  },
})
