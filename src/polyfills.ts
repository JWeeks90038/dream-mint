// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';

// Make Buffer available globally
(window as any).Buffer = Buffer;

// Define comprehensive process object
(window as any).process = {
  env: {
    NODE_ENV: 'development'
  },
  version: 'v16.0.0',
  platform: 'browser' as any,
  browser: true,
  versions: {
    node: '16.0.0'
  } as any,
  nextTick: function(fn: Function, ...args: any[]) {
    setTimeout(() => fn(...args), 0);
  },
  stdout: null as any,
  stderr: null as any,
  cwd: () => '/',
  argv: [],
  exit: (() => {}) as any,
  on: (() => {}) as any,
  once: (() => {}) as any,
  off: (() => {}) as any,
  emit: (() => {}) as any,
  hrtime: (() => [0, 0]) as any,
  uptime: () => 0,
  memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }),
  cpuUsage: () => ({ user: 0, system: 0 })
};

// Define util module polyfills
const util = {
  inspect: function(obj: any, _options?: any) {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'string') return `'${obj}'`;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (obj instanceof Error) return obj.toString();
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return '[object Object]';
    }
  },
  debuglog: function(_section: string) {
    return function(..._args: any[]) {
      // Silent in browser - no debug logging
    };
  },
  format: function(f: string, ...args: any[]) {
    let i = 0;
    return f.replace(/%[sdj%]/g, (match) => {
      if (match === '%%') return '%';
      if (i >= args.length) return match;
      switch (match) {
        case '%s': return String(args[i++]);
        case '%d': return String(Number(args[i++]));
        case '%j':
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return '[Circular]';
          }
        default:
          return match;
      }
    });
  },
  deprecate: function(fn: Function, msg: string) {
    let warned = false;
    return function(this: any, ...args: any[]) {
      if (!warned) {
        warned = true;
        console.warn(`DeprecationWarning: ${msg}`);
      }
      return fn.apply(this, args);
    };
  },
  isArray: Array.isArray,
  isBoolean: (arg: any) => typeof arg === 'boolean',
  isNull: (arg: any) => arg === null,
  isNullOrUndefined: (arg: any) => arg == null,
  isNumber: (arg: any) => typeof arg === 'number',
  isString: (arg: any) => typeof arg === 'string',
  isSymbol: (arg: any) => typeof arg === 'symbol',
  isUndefined: (arg: any) => arg === undefined,
  isObject: (arg: any) => typeof arg === 'object' && arg !== null,
  isFunction: (arg: any) => typeof arg === 'function',
  isPrimitive: (arg: any) => arg == null || (typeof arg !== 'object' && typeof arg !== 'function'),
  inherits: function(ctor: any, superCtor: any) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: { value: ctor, enumerable: false, writable: true, configurable: true }
    });
  },
  // Add additional util methods that might be needed
  promisify: function(fn: Function) {
    return function(this: any, ...args: any[]) {
      return new Promise((resolve, reject) => {
        fn.call(this, ...args, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };
  },
  callbackify: function(fn: Function) {
    return function(this: any, ...args: any[]) {
      const callback = args.pop();
      fn.apply(this, args).then(
        (result: any) => callback(null, result),
        (error: any) => callback(error)
      );
    };
  },
  types: {
    isAnyArrayBuffer: (arg: any) => arg instanceof ArrayBuffer,
    isArgumentsObject: (arg: any) => Object.prototype.toString.call(arg) === '[object Arguments]',
    isAsyncFunction: (arg: any) => typeof arg === 'function' && arg.constructor.name === 'AsyncFunction',
    isDate: (arg: any) => arg instanceof Date,
    isRegExp: (arg: any) => arg instanceof RegExp,
    isPromise: (arg: any) => arg && typeof arg.then === 'function'
  }
};

(window as any).util = util;

// Make global objects available
(window as any).global = window;
(window as any).global.process = (window as any).process;
(window as any).global.Buffer = Buffer;
(window as any).global.util = (window as any).util;

export {};
