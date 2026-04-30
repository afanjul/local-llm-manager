import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

export function getDatasetsCacheDir(): string {
  if (process.env.HF_DATASETS_CACHE) return process.env.HF_DATASETS_CACHE;
  if (process.env.HF_HOME) return path.join(process.env.HF_HOME, 'datasets');
  return path.join(os.homedir(), '.cache', 'huggingface', 'datasets');
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

export function scanHfDatasets(): ProviderStats {
  const cacheDir = getDatasetsCacheDir();
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
        id: `huggingface-datasets::${entryPath}`,
        provider: 'huggingface-datasets',
        resourceType: 'dataset',
        logicalName: entry.name.replace(/--/g, '/'),
        localPath: entryPath,
        sizeBytes: size,
        rootPath: cacheDir,
        isDeletable: true,
        deleteStrategy: 'repo_delete',
        lastSeenAt: mtime,
        hfCacheClass: 'datasets',
      });
    }
  } catch {}

  return {
    provider: 'huggingface-datasets',
    label: 'HF Datasets',
    rootPath: cacheDir,
    isAvailable: artifacts.length > 0 || fs.existsSync(cacheDir),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
