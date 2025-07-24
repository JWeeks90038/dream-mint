import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v16.0.0'),
    'process.versions': JSON.stringify({ node: '16.0.0' }),
    'process.browser': 'true',
    'process.nextTick': 'setTimeout',
    'process.stdout': 'null',
    'process.stderr': 'null',
  },
  resolve: {
    alias: {
      // Node.js polyfills for browser compatibility
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      http: 'stream-http',
      https: 'https-browserify',
      zlib: 'browserify-zlib',
      url: 'url',
      buffer: 'buffer',
      util: 'util',
      os: 'os-browserify/browser',
      path: 'path-browserify',
      assert: 'assert',
      fs: 'memfs',
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'stream-browserify',
      'crypto-browserify',
      'stream-http',
      'https-browserify',
      'browserify-zlib',
      'url',
      'util',
      'os-browserify/browser',
      'path-browserify',
      'assert',
      'memfs',
    ],
  },
});
