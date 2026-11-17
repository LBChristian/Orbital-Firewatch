// Bundle the API (including the shared simulation package) into a single ESM file.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  packages: 'external',
  // The workspace simulation package is TypeScript source: bundle it instead of importing at runtime.
  alias: { '@ofw/simulation': '../../packages/simulation/src/index.ts' },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
});
