import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Find the first existing directory among candidates (dev: source tree; prod: built dist). */
function firstDir(candidates: string[]): string | undefined {
  return candidates.find((c) => fs.existsSync(c));
}

const repoRootCandidates = [path.resolve(here, '../../..'), path.resolve(here, '../..'), process.cwd()];
const production = process.env.NODE_ENV === 'production';
const webDist = firstDir(repoRootCandidates.map((r) => path.join(r, 'apps/web/dist')));
const publicSnapshots = repoRootCandidates.map((r) => path.join(r, 'apps/web/public/data/firms'));
const distSnapshots = webDist ? [path.join(webDist, 'data/firms')] : [];
// Production reads the built copy; development reads the source copy in public/.
const snapshotDir = process.env.FIRMS_SNAPSHOT_DIR ?? firstDir(production ? [...distSnapshots, ...publicSnapshots] : [...publicSnapshots, ...distSnapshots]);

const port = Number(process.env.PORT ?? 4000);
const mapKey = process.env.FIRMS_MAP_KEY;
const ttl = Number(process.env.FIRMS_CACHE_TTL_SECONDS ?? 900);

const app = createApp({
  mapKey,
  cacheTtlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 900,
  snapshotDir,
  webDistDir: production || process.env.SERVE_WEB === '1' ? webDist : undefined,
  log: (m) => console.log(`[api] ${m}`),
});

app.listen(port, () => {
  console.log(`[api] ORBITAL FIREWATCH API listening on http://localhost:${port}`);
  console.log(`[api] FIRMS MAP_KEY ${mapKey && mapKey !== 'replace_me' ? 'configured (value hidden)' : 'NOT configured: serving bundled historical snapshot'}`);
  console.log(`[api] snapshot dir: ${snapshotDir ?? 'none found'}`);
  if (production || process.env.SERVE_WEB === '1') console.log(`[api] serving web build from ${webDist ?? 'NOT FOUND (run npm run build)'}`);
});
