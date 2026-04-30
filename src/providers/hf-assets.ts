import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

export function getAssetsCacheDir(): string {
  if (process.env.HF_ASSETS_CACHE) return process.env.HF_ASSETS_CACHE;
  if (process.env.HF_HOME) return path.join(process.env.HF_HOME, 'assets');
  return path.join(os.homedir(), '.cache', 'huggingface', 'assets');
}

function dirSize(dirPath: string): number {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += dirSize(fullPath);
        } else if (entry.isFile()) {
          total += fs.statSync(fullPath).size;
        }
      } catch {}
    }
  } catch {}
  return total;
}

export function scanHfAssets(): ProviderStats {
  const cacheDir = getAssetsCacheDir();
  const artifacts: StoredArtifact[] = [];

  try {
    const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const entryPath = path.join(cacheDir, entry.name);
      let mtime = new Date(0);
      try { mtime = fs.statSync(entryPath).mtime; } catch {}
      const size = dirSize(entryPath);

      artifacts.push({
        id: `huggingface-assets::${entryPath}`,
        provider: 'huggingface-assets',
        resourceType: 'asset',
        logicalName: entry.name,
        localPath: entryPath,
        sizeBytes: size,
        rootPath: cacheDir,
        isDeletable: true,
        deleteStrategy: 'repo_delete',
        lastSeenAt: mtime,
        hfCacheClass: 'assets',
      });
    }
  } catch {}

  return {
    provider: 'huggingface-assets',
    label: 'HF Assets',
    rootPath: cacheDir,
    isAvailable: artifacts.length > 0 || fs.existsSync(cacheDir),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
