// Global type declarations for browser polyfills
declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: NodeJS.Process;
    global: typeof globalThis;
  }
  
  var Buffer: typeof Buffer;
  var process: NodeJS.Process;
  var global: typeof globalThis;
}

export {};
