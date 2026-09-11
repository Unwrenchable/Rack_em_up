import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Render/dashboard pastes sometimes store `VITE_API_URL=https://...` as the value. */
function scrubBuildEnv() {
  for (const key of ['VITE_API_URL', 'VITE_API_BASE_URL', 'VITE_WS_URL'] as const) {
    const v = process.env[key];
    if (!v) continue;
    const stripped = v.replace(new RegExp(`^${key}=`, 'i'), '').trim();
    if (stripped && stripped !== v) {
      process.env[key] = stripped;
      // eslint-disable-next-line no-console
      console.warn(`[vite] scrubbed malformed ${key} env value`);
    }
  }
}

scrubBuildEnv();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // REST API
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Socket.IO (websocket + polling) - fixes ERR_CONNECTION_REFUSED when FE uses relative host
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
