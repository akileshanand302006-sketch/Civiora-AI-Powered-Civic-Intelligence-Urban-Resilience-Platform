import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import net from 'net';
import { spawn, type ChildProcess } from 'child_process';

function isPortActive(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function autoBackendPlugin(): Plugin {
  let backendProc: ChildProcess | null = null;
  return {
    name: 'auto-backend-server',
    async configureServer() {
      // Skip if vitest or if root orchestrator is already running backend
      if (process.env.VITEST || process.env.CIVIORA_ROOT_ORCHESTRATED) {
        return;
      }

      // Check if backend is already running on port 4000
      const active = await isPortActive(4000);
      if (active) {
        console.log('⚡ [Civiora] Backend is already active on port 4000.');
        return;
      }

      console.log('\n⚡ [Civiora] Standalone web mode detected. Auto-starting backend server on port 4000...');
      const backendDir = path.resolve(__dirname, '../backend');
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'cmd.exe' : 'npm';
      const args = isWin ? ['/c', 'npm', 'run', 'dev'] : ['run', 'dev'];

      backendProc = spawn(cmd, args, {
        cwd: backendDir,
        stdio: 'inherit',
      });

      backendProc.on('error', (err) => {
        console.warn('⚠️ [Civiora] Auto-backend process note:', err.message);
      });

      const cleanup = () => {
        if (backendProc) {
          backendProc.kill();
          backendProc = null;
        }
      };

      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    },
  };
}

export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@civicpulse/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Modern Dart Sass compiler API eliminates legacy-js-api deprecation warning
        api: 'modern-compiler',
        additionalData: `@use "@/design-system/css/_tokens" as *;\n`,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          map: ['@googlemaps/js-api-loader'],
          ui: ['bootstrap', 'framer-motion', 'animejs'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
